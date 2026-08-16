import json as json_module
from flask import Blueprint, request, jsonify
import psycopg2.extras
from db import get_db
from auth_middleware import requiere_token

preguntas_bp = Blueprint('preguntas', __name__)


@preguntas_bp.route('/api/preguntas', methods=['GET', 'OPTIONS'])
@requiere_token
def listar_preguntas():
    """
    GET /api/preguntas

    Retorna la lista completa del banco de preguntas.
    Parámetros de consulta opcionales:
      - tipo: Filtra por tipo de pregunta ('abierta' o 'multiple').
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        tipo_filtro = request.args.get('tipo', '').strip()

        query = """
            SELECT
                p.id, p.texto, p.tipo, p.opciones_json,
                p.respuesta_correcta, p.creado_por,
                p.created_at, p.updated_at,
                u.nombre AS nombre_creador
            FROM preguntas p
            LEFT JOIN usuarios u ON u.id = p.creado_por
            {where}
            ORDER BY p.created_at DESC
        """

        if tipo_filtro:
            cur.execute(query.format(where="WHERE p.tipo = %s"), (tipo_filtro,))
        else:
            cur.execute(query.format(where=""))

        preguntas = cur.fetchall()

        resultado = []
        for p in preguntas:
            fila = dict(p)
            if fila.get('opciones_json'):
                try:
                    fila['opciones'] = json_module.loads(fila['opciones_json'])
                except (ValueError, TypeError):
                    fila['opciones'] = []
            else:
                fila['opciones'] = []
            resultado.append(fila)

        return jsonify(resultado), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@preguntas_bp.route('/api/preguntas', methods=['POST', 'OPTIONS'])
@requiere_token
def crear_pregunta():
    """
    POST /api/preguntas

    Crea un nuevo reactivo en el banco de preguntas.
    Cuerpo JSON esperado:
      - texto (str, obligatorio): Enunciado de la pregunta.
      - tipo (str, obligatorio): 'abierta' o 'multiple'.
      - opciones (list, opcional): Lista de opciones (solo para 'multiple').
      - respuesta_correcta (str, opcional): Opción correcta para calificación automática.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Se esperaba un cuerpo JSON en la petición.'}), 400

    texto = (data.get('texto') or '').strip()
    tipo = (data.get('tipo') or '').strip()

    if not texto:
        return jsonify({'error': 'El campo texto es obligatorio.'}), 400
    if tipo not in ('abierta', 'multiple'):
        return jsonify({'error': "El tipo debe ser 'abierta' o 'multiple'."}), 400

    opciones = data.get('opciones', [])
    if tipo == 'multiple' and len(opciones) < 2:
        return jsonify({'error': 'Las preguntas de tipo múltiple requieren al menos 2 opciones.'}), 400

    respuesta_correcta = (data.get('respuesta_correcta') or '').strip() or None
    opciones_json = json_module.dumps(opciones, ensure_ascii=False) if opciones else None
    usuario_id = request.usuario.get("sub") or request.usuario.get("id")

    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            INSERT INTO preguntas (texto, tipo, opciones_json, respuesta_correcta, creado_por)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, texto, tipo, opciones_json, respuesta_correcta, creado_por, created_at
        """, (texto, tipo, opciones_json, respuesta_correcta, usuario_id))
        nueva = dict(cur.fetchone())
        conn.commit()

        nueva['opciones'] = json_module.loads(nueva['opciones_json']) if nueva.get('opciones_json') else []
        return jsonify(nueva), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@preguntas_bp.route('/api/preguntas/<int:pregunta_id>', methods=['GET', 'OPTIONS'])
@requiere_token
def obtener_pregunta(pregunta_id):
    """
    GET /api/preguntas/<id>

    Retorna el detalle de una pregunta específica del banco.
    Retorna HTTP 404 si la pregunta no existe.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT
                p.id, p.texto, p.tipo, p.opciones_json,
                p.respuesta_correcta, p.creado_por,
                p.created_at, p.updated_at,
                u.nombre AS nombre_creador
            FROM preguntas p
            LEFT JOIN usuarios u ON u.id = p.creado_por
            WHERE p.id = %s
        """, (pregunta_id,))
        fila = cur.fetchone()
        if not fila:
            return jsonify({'error': 'Pregunta no encontrada.'}), 404

        resultado = dict(fila)
        if resultado.get('opciones_json'):
            try:
                resultado['opciones'] = json_module.loads(resultado['opciones_json'])
            except (ValueError, TypeError):
                resultado['opciones'] = []
        else:
            resultado['opciones'] = []

        return jsonify(resultado), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@preguntas_bp.route('/api/preguntas/<int:pregunta_id>', methods=['PUT', 'OPTIONS'])
@requiere_token
def editar_pregunta(pregunta_id):
    """
    PUT /api/preguntas/<id>

    Actualiza los datos de una pregunta existente en el banco.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Se esperaba un cuerpo JSON en la petición.'}), 400

    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute("SELECT id, tipo FROM preguntas WHERE id = %s", (pregunta_id,))
        existente = cur.fetchone()
        if not existente:
            return jsonify({'error': 'Pregunta no encontrada.'}), 404

        texto = (data.get('texto') or '').strip() or None
        tipo = (data.get('tipo') or '').strip() or None
        opciones = data.get('opciones')
        respuesta_correcta = data.get('respuesta_correcta')

        if tipo and tipo not in ('abierta', 'multiple'):
            return jsonify({'error': "El tipo debe ser 'abierta' o 'multiple'."}), 400

        if tipo == 'multiple' and opciones is not None and len(opciones) < 2:
            return jsonify({'error': 'Las preguntas de tipo múltiple requieren al menos 2 opciones.'}), 400

        opciones_json = json_module.dumps(opciones, ensure_ascii=False) if opciones is not None else None

        campos = []
        valores = []

        if texto:
            campos.append("texto = %s")
            valores.append(texto)
        if tipo:
            campos.append("tipo = %s")
            valores.append(tipo)
        if opciones_json is not None:
            campos.append("opciones_json = %s")
            valores.append(opciones_json)
        if respuesta_correcta is not None:
            campos.append("respuesta_correcta = %s")
            valores.append(respuesta_correcta.strip() or None)

        if not campos:
            return jsonify({'error': 'No se enviaron campos válidos para actualizar.'}), 400

        valores.append(pregunta_id)
        cur.execute(
            f"UPDATE preguntas SET {', '.join(campos)} WHERE id = %s RETURNING id, texto, tipo, opciones_json, respuesta_correcta, updated_at",
            valores
        )
        actualizada = dict(cur.fetchone())
        conn.commit()

        actualizada['opciones'] = json_module.loads(actualizada['opciones_json']) if actualizada.get('opciones_json') else []
        return jsonify(actualizada), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@preguntas_bp.route('/api/preguntas/<int:pregunta_id>', methods=['DELETE', 'OPTIONS'])
@requiere_token
def eliminar_pregunta(pregunta_id):
    """
    DELETE /api/preguntas/<id>

    Elimina permanentemente una pregunta del banco.
    Retorna HTTP 409 Conflict si la pregunta está asignada a un examen activo.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute("SELECT id FROM preguntas WHERE id = %s", (pregunta_id,))
        if not cur.fetchone():
            return jsonify({'error': 'Pregunta no encontrada.'}), 404

        cur.execute("SELECT COUNT(*) AS cnt FROM examen_preguntas WHERE pregunta_id = %s", (pregunta_id,))
        uso = cur.fetchone()
        if uso and uso['cnt'] > 0:
            return jsonify({
                'error': 'No se puede eliminar esta pregunta porque está asignada a uno o más exámenes.'
            }), 409

        cur.execute("DELETE FROM preguntas WHERE id = %s", (pregunta_id,))
        conn.commit()
        return jsonify({'mensaje': 'Pregunta eliminada correctamente del banco.'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
