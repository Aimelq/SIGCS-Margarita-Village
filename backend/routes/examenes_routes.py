import uuid
import json as json_module
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
import psycopg2.extras
from db import get_db
from auth_middleware import requiere_token

examenes_bp = Blueprint('examenes', __name__)


@examenes_bp.route('/api/aspirantes/<cedula>/examenes', methods=['POST', 'OPTIONS'])
@requiere_token
def generar_examen(cedula):
    """
    POST /api/aspirantes/<cedula>/examenes

    Genera un nuevo examen técnico para un candidato específico.
    Selecciona 10 preguntas cerradas y hasta 3 preguntas abiertas
    de forma aleatoria desde el banco de preguntas.
    El examen tiene una vigencia de 3 días y un token único de acceso.
    """
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT id FROM aspirantes WHERE cedula = %s", (cedula,))
        asp = cur.fetchone()
        if not asp:
            return jsonify({'error': 'Aspirante no encontrado'}), 404

        cur.execute("SELECT id FROM preguntas WHERE tipo IN ('Opción múltiple', 'Verdadero/Falso') ORDER BY RANDOM() LIMIT 10")
        preguntas_cerradas = cur.fetchall()

        cur.execute("SELECT id FROM preguntas WHERE tipo = 'Desarrollo abierto' ORDER BY RANDOM() LIMIT 3")
        preguntas_abiertas = cur.fetchall()

        preguntas_seleccionadas = preguntas_cerradas + preguntas_abiertas

        if not preguntas_seleccionadas:
            return jsonify({'error': 'No hay preguntas en el banco'}), 400

        token = uuid.uuid4().hex
        vencimiento = datetime.now() + timedelta(days=3)

        cur.execute("""
            INSERT INTO examenes (aspirante_id, token_unico, fecha_vencimiento, estado)
            VALUES (%s, %s, %s, 'Emitido') RETURNING id
        """, (asp['id'], token, vencimiento))
        examen_id = cur.fetchone()['id']

        for i, p in enumerate(preguntas_seleccionadas):
            cur.execute("""
                INSERT INTO examen_preguntas (examen_id, pregunta_id, orden, puntaje_max)
                VALUES (%s, %s, %s, 1.0)
            """, (examen_id, p['id'], i + 1))

        conn.commit()
        return jsonify({'mensaje': 'Examen generado', 'token': token}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@examenes_bp.route('/api/aspirantes/<cedula>/examenes', methods=['GET', 'OPTIONS'])
@requiere_token
def listar_examenes(cedula):
    """
    GET /api/aspirantes/<cedula>/examenes

    Lista todos los exámenes asignados a un candidato, ordenados por fecha de emisión.
    """
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT id FROM aspirantes WHERE cedula = %s", (cedula,))
        asp = cur.fetchone()
        if not asp:
            return jsonify({'error': 'Aspirante no encontrado'}), 404

        cur.execute("""
            SELECT id, token_unico, fecha_emision, fecha_vencimiento, estado, puntaje
            FROM examenes WHERE aspirante_id = %s ORDER BY fecha_emision DESC
        """, (asp['id'],))
        return jsonify(cur.fetchall()), 200
    finally:
        conn.close()


@examenes_bp.route('/api/evaluacion/<token>', methods=['GET', 'OPTIONS'])
def obtener_examen_publico(token):
    """
    GET /api/evaluacion/<token>

    Endpoint público para que el candidato acceda a su examen mediante el
    token único enviado. No requiere autenticación JWT (acceso por link).
    """
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT e.id, e.estado, e.fecha_vencimiento, a.nombre, a.apellido
            FROM examenes e JOIN aspirantes a ON e.aspirante_id = a.id
            WHERE e.token_unico = %s
        """, (token,))
        examen = cur.fetchone()

        if not examen:
            return jsonify({'error': 'Examen no encontrado'}), 404

        if examen['estado'] != 'Emitido':
            return jsonify({'error': f"Examen ya fue procesado o expiró. Estado: {examen['estado']}"}), 400

        cur.execute("""
            SELECT ep.id as examen_pregunta_id, p.texto, p.tipo, p.opciones_json, ep.orden
            FROM examen_preguntas ep
            JOIN preguntas p ON ep.pregunta_id = p.id
            WHERE ep.examen_id = %s
            ORDER BY ep.orden ASC
        """, (examen['id'],))
        preguntas = cur.fetchall()

        for p in preguntas:
            p['opciones'] = json_module.loads(p['opciones_json']) if p.get('opciones_json') else []
            del p['opciones_json']

        return jsonify({
            'candidato': f"{examen['nombre']} {examen['apellido']}",
            'preguntas': preguntas
        }), 200
    finally:
        conn.close()


@examenes_bp.route('/api/evaluacion/<token>', methods=['POST', 'OPTIONS'])
def responder_examen_publico(token):
    """
    POST /api/evaluacion/<token>

    Procesa las respuestas enviadas por el candidato, auto-califica las preguntas
    cerradas (múltiple opción / verdadero-falso) y registra el puntaje final.
    """
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    datos = request.get_json() or {}
    respuestas = datos.get('respuestas', [])

    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT id, estado FROM examenes WHERE token_unico = %s", (token,))
        examen = cur.fetchone()

        if not examen:
            return jsonify({'error': 'Examen no encontrado'}), 404
        if examen['estado'] != 'Emitido':
            return jsonify({'error': 'El examen no admite respuestas'}), 400

        puntaje_total = 0
        for r in respuestas:
            ep_id = r.get('examen_pregunta_id')
            ans = r.get('respuesta', '')

            cur.execute("""
                SELECT p.respuesta_correcta, ep.puntaje_max
                FROM examen_preguntas ep JOIN preguntas p ON ep.pregunta_id = p.id
                WHERE ep.id = %s AND ep.examen_id = %s
            """, (ep_id, examen['id']))
            p_data = cur.fetchone()
            if not p_data:
                continue

            es_correcta = None
            pts = 0
            if p_data['respuesta_correcta']:
                es_correcta = (str(p_data['respuesta_correcta']).strip().lower() == str(ans).strip().lower())
                pts = float(p_data['puntaje_max']) if es_correcta else 0

            puntaje_total += pts

            cur.execute("""
                INSERT INTO respuestas_examen (examen_pregunta_id, respuesta, es_correcta, puntaje)
                VALUES (%s, %s, %s, %s)
            """, (ep_id, ans, es_correcta, pts))

        cur.execute("UPDATE examenes SET estado = 'Finalizado', puntaje = %s WHERE id = %s", (puntaje_total, examen['id']))
        conn.commit()
        return jsonify({'mensaje': 'Examen completado exitosamente'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
