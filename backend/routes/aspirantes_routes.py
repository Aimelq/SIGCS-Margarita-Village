import os
import json as json_module
from flask import Blueprint, request, jsonify, send_from_directory
import psycopg2.extras
from werkzeug.utils import secure_filename
from db import get_db
from auth_middleware import requiere_token
from config import UPLOAD_FOLDER

aspirantes_bp = Blueprint('aspirantes', __name__)


@aspirantes_bp.route("/api/aspirantes/<cedula>", methods=["GET", "OPTIONS"])
def obtener_aspirante(cedula):
    """
    GET /api/aspirantes/<cedula>

    Retorna el perfil integral de 360° de un candidato identificado por su cédula.
    Combina datos personales, perfil laboral, datos bancarios, disponibilidad
    y lista de documentos adjuntos (CVs).
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute("""
            SELECT
                a.*,
                p.empleo_solicitado,
                p.sueldo_aspira,
                p.experiencia_ultimos_empleos,
                p.habilidades,
                p.motivacion,
                p.fortalezas,
                p.referencias,
                p.data_bancaria,
                p.disponibilidad_rotativa,
                p.disponibilidad_fines,
                p.municipio,
                p.municipio AS municipio_postulacion,
                p.estado_civil,
                p.carga_familiar,
                p.medio_transporte,
                p.tipo_vehiculo,
                p.form_data,
                a.estado_actual AS estado,
                p.fecha_solicitud,
                p.id as postulacion_id
            FROM aspirantes a
            LEFT JOIN postulaciones p ON p.aspirante_id = a.id
            WHERE a.cedula = %s
            ORDER BY p.fecha_solicitud DESC, p.id DESC
            LIMIT 1
        """, (cedula,))

        aspirante = cur.fetchone()
        if not aspirante:
            return jsonify({"error": "Candidato no encontrado en el sistema"}), 404

        cur.execute("""
            SELECT
                id,
                nombre_original AS nombre_archivo,
                substring(ruta_archivo from 'uploads/(.*)') AS nombre_real,
                tipo,
                uploaded_at AS created_at
            FROM documentos
            WHERE aspirante_id = %s
        """, (aspirante["id"],))
        documentos = cur.fetchall()

        resultado = dict(aspirante)
        resultado["documentos"] = list(documentos)

        return jsonify(resultado), 200

    finally:
        conn.close()


@aspirantes_bp.route("/api/aspirantes/<cedula>/historial", methods=["GET", "OPTIONS"])
@requiere_token
def obtener_historial(cedula):
    """
    GET /api/aspirantes/<cedula>/historial

    Obtiene la línea de tiempo completa (traza histórica) de decisiones de selección
    tomadas sobre un candidato a lo largo del tiempo.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT
                h.id,
                h.veredicto AS estado_nuevo,
                NULL AS estado_anterior,
                h.notas,
                h.motivo_rechazo,
                h.created_at,
                u.nombre AS usuario_nombre,
                h.cargo_solicitado AS empleo_solicitado
            FROM historiales h
            JOIN aspirantes a ON a.id = h.aspirante_id
            LEFT JOIN usuarios u ON u.id = h.user_id
            WHERE a.cedula = %s
            ORDER BY h.created_at DESC
        """, (cedula,))

        historial = cur.fetchall()
        return jsonify(historial), 200

    finally:
        conn.close()


@aspirantes_bp.route("/api/aspirantes/<cedula>/estado", methods=["PUT", "OPTIONS"])
@requiere_token
def actualizar_estado(cedula):
    """
    PUT /api/aspirantes/<cedula>/estado

    Actualiza manualmente el estado del proceso de un candidato y registra
    automáticamente una traza en la Memoria Institucional.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    datos = request.get_json() or {}
    nuevo_estado = datos.get("estado")
    notas = datos.get("notas", "")
    motivo_rechazo = datos.get("motivo_rechazo", "")

    if not nuevo_estado:
        return jsonify({"error": "El nuevo estado es obligatorio"}), 400

    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute("""
            SELECT p.id, a.estado_actual AS estado
            FROM postulaciones p
            JOIN aspirantes a ON a.id = p.aspirante_id
            WHERE a.cedula = %s
            ORDER BY p.fecha_solicitud DESC
            LIMIT 1
        """, (cedula,))
        postulacion = cur.fetchone()

        if not postulacion:
            return jsonify({"error": "No se encontró postulación activa para el candidato"}), 404

        postulacion_id = postulacion["id"]
        usuario_id = request.usuario.get("sub")

        cur.execute(
            "UPDATE aspirantes SET estado_actual = %s WHERE id = (SELECT aspirante_id FROM postulaciones WHERE id = %s)",
            (nuevo_estado, postulacion_id)
        )

        cur.execute("""
            INSERT INTO historiales
                (aspirante_id, fecha, cargo_solicitado, veredicto, motivo_rechazo, notas, user_id)
            VALUES
                ((SELECT id FROM aspirantes WHERE cedula = %s), CURRENT_DATE, (SELECT empleo_solicitado FROM postulaciones WHERE id = %s), %s, %s, %s, %s)
        """, (cedula, postulacion_id, nuevo_estado, motivo_rechazo, notas, usuario_id))

        conn.commit()
        return jsonify({"mensaje": "Estado actualizado correctamente"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@aspirantes_bp.route("/api/aspirantes", methods=["POST", "OPTIONS"])
def crear_aspirante():
    """
    POST /api/aspirantes

    Registra o actualiza la postulación de un aspirante desde el formulario público.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    f = request.get_json() or {}
    cedula = f.get("cedula")
    if not cedula:
        return jsonify({"error": "La cédula es obligatoria"}), 400

    disp_rot = True if str(f.get("disponibilidad_rotativa")).lower() in ['sí', 'si', 'true', '1'] else False
    disp_fin = True if str(f.get("disponibilidad_fines")).lower() in ['sí', 'si', 'true', '1'] else False

    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute("SELECT id FROM aspirantes WHERE cedula = %s", (cedula,))
        existente = cur.fetchone()

        if existente:
            aspirante_id = existente["id"]
            cur.execute("""
                UPDATE aspirantes SET
                    nombre = COALESCE(NULLIF(%s, ''), nombre),
                    apellido = COALESCE(NULLIF(%s, ''), apellido),
                    telefono = COALESCE(NULLIF(%s, ''), telefono),
                    correo = COALESCE(NULLIF(%s, ''), correo),
                    direccion = COALESCE(NULLIF(%s, ''), direccion),
                    formacion = COALESCE(NULLIF(%s, ''), formacion)
                WHERE id = %s
            """, (
                f.get("nombre"), f.get("apellido"),
                f.get("telefono"), f.get("correo"),
                f.get("direccion"), f.get("formacion"), aspirante_id
            ))
        else:
            cur.execute("""
                INSERT INTO aspirantes
                    (cedula, nombre, apellido, correo, telefono, direccion, formacion)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                cedula, f.get("nombre"), f.get("apellido"),
                f.get("correo"), f.get("telefono"),
                f.get("direccion"), f.get("formacion")
            ))
            aspirante_id = cur.fetchone()["id"]

        form_data_json = json_module.dumps(f, ensure_ascii=False)

        cur.execute("""
            INSERT INTO postulaciones
                (aspirante_id, empleo_solicitado, sueldo_aspira,
                 experiencia_ultimos_empleos, habilidades, motivacion, fortalezas,
                 referencias, data_bancaria, disponibilidad_rotativa, disponibilidad_fines,
                 municipio, estado_civil, carga_familiar, medio_transporte, tipo_vehiculo, form_data)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (aspirante_id, fecha_solicitud) DO UPDATE SET
                empleo_solicitado = EXCLUDED.empleo_solicitado,
                sueldo_aspira = EXCLUDED.sueldo_aspira,
                experiencia_ultimos_empleos = EXCLUDED.experiencia_ultimos_empleos,
                habilidades = EXCLUDED.habilidades,
                motivacion = EXCLUDED.motivacion,
                fortalezas = EXCLUDED.fortalezas,
                referencias = EXCLUDED.referencias,
                data_bancaria = EXCLUDED.data_bancaria,
                disponibilidad_rotativa = EXCLUDED.disponibilidad_rotativa,
                disponibilidad_fines = EXCLUDED.disponibilidad_fines,
                municipio = EXCLUDED.municipio,
                estado_civil = EXCLUDED.estado_civil,
                carga_familiar = EXCLUDED.carga_familiar,
                medio_transporte = EXCLUDED.medio_transporte,
                tipo_vehiculo = EXCLUDED.tipo_vehiculo,
                form_data = EXCLUDED.form_data
        """, (
            aspirante_id,
            f.get("empleo_solicitado"), f.get("sueldo_aspira"),
            f.get("experiencia_ultimos_empleos"), f.get("habilidades"), f.get("motivacion"), f.get("fortalezas"),
            f.get("referencias"), f.get("data_bancaria"), disp_rot, disp_fin,
            f.get("municipio"), f.get("estado_civil"), f.get("carga_familiar"),
            f.get("medio_transporte"), f.get("tipo_vehiculo"), form_data_json
        ))

        conn.commit()
        return jsonify({"mensaje": "Aspirante y postulación guardados correctamente"}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@aspirantes_bp.route("/api/aspirantes/<cedula>", methods=["PUT", "OPTIONS"])
def actualizar_aspirante(cedula):
    """
    PUT /api/aspirantes/<cedula>

    Actualiza la ficha de datos de un aspirante registrado.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    f = request.get_json() or {}
    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT id FROM aspirantes WHERE cedula = %s", (cedula,))
        existente = cur.fetchone()
        if not existente:
            return jsonify({"error": "Aspirante no encontrado en el sistema"}), 404

        aspirante_id = existente["id"]

        disp_rot = True if str(f.get("disponibilidad_rotativa")).lower() in ['sí', 'si', 'true', '1'] else False
        disp_fin = True if str(f.get("disponibilidad_fines")).lower() in ['sí', 'si', 'true', '1'] else False

        cur.execute("""
            UPDATE aspirantes SET
                nombre = COALESCE(NULLIF(%s, ''), nombre),
                apellido = COALESCE(NULLIF(%s, ''), apellido),
                telefono = COALESCE(NULLIF(%s, ''), telefono),
                correo = COALESCE(NULLIF(%s, ''), correo),
                direccion = COALESCE(NULLIF(%s, ''), direccion),
                formacion = COALESCE(NULLIF(%s, ''), formacion)
            WHERE id = %s
        """, (
            f.get("nombre"), f.get("apellido"),
            f.get("telefono"), f.get("correo"),
            f.get("direccion"), f.get("formacion"), aspirante_id
        ))

        form_data_json = json_module.dumps(f, ensure_ascii=False)

        cur.execute("""
            INSERT INTO postulaciones
                (aspirante_id, empleo_solicitado, sueldo_aspira,
                 experiencia_ultimos_empleos, habilidades, motivacion, fortalezas,
                 referencias, data_bancaria, disponibilidad_rotativa, disponibilidad_fines,
                 municipio, estado_civil, carga_familiar, medio_transporte, tipo_vehiculo, form_data)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (aspirante_id, fecha_solicitud) DO UPDATE SET
                empleo_solicitado = EXCLUDED.empleo_solicitado,
                sueldo_aspira = EXCLUDED.sueldo_aspira,
                experiencia_ultimos_empleos = EXCLUDED.experiencia_ultimos_empleos,
                habilidades = EXCLUDED.habilidades,
                motivacion = EXCLUDED.motivacion,
                fortalezas = EXCLUDED.fortalezas,
                referencias = EXCLUDED.referencias,
                data_bancaria = EXCLUDED.data_bancaria,
                disponibilidad_rotativa = EXCLUDED.disponibilidad_rotativa,
                disponibilidad_fines = EXCLUDED.disponibilidad_fines,
                municipio = EXCLUDED.municipio,
                estado_civil = EXCLUDED.estado_civil,
                carga_familiar = EXCLUDED.carga_familiar,
                medio_transporte = EXCLUDED.medio_transporte,
                tipo_vehiculo = EXCLUDED.tipo_vehiculo,
                form_data = EXCLUDED.form_data
        """, (
            aspirante_id,
            f.get("empleo_solicitado"), f.get("sueldo_aspira"),
            f.get("experiencia_ultimos_empleos"), f.get("habilidades"), f.get("motivacion"), f.get("fortalezas"),
            f.get("referencias"), f.get("data_bancaria"), disp_rot, disp_fin,
            f.get("municipio"), f.get("estado_civil"), f.get("carga_familiar"),
            f.get("medio_transporte"), f.get("tipo_vehiculo"), form_data_json
        ))

        conn.commit()
        return jsonify({"mensaje": "Aspirante actualizado correctamente"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@aspirantes_bp.route("/api/aspirantes/<cedula>/cv", methods=["POST", "OPTIONS"])
def subir_cv(cedula):
    """
    POST /api/aspirantes/<cedula>/cv

    Permite adjuntar un archivo de hoja de vida (CV) a un expediente existente.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    archivo_cv = request.files.get("archivo")
    if not archivo_cv or not archivo_cv.filename:
        return jsonify({"error": "No se adjuntó ningún archivo"}), 400

    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT id FROM aspirantes WHERE cedula = %s", (cedula,))
        existente = cur.fetchone()
        if not existente:
            return jsonify({"error": "Aspirante no encontrado"}), 404

        aspirante_id = existente["id"]
        nombre_seguro = secure_filename(archivo_cv.filename)
        ruta = os.path.join(UPLOAD_FOLDER, f"{cedula}_{nombre_seguro}")
        archivo_cv.save(ruta)

        cur.execute("""
            INSERT INTO documentos (aspirante_id, nombre_original, ruta_archivo, tipo)
            VALUES (%s, %s, %s, 'CV')
        """, (aspirante_id, nombre_seguro, ruta))

        conn.commit()
        return jsonify({"mensaje": "Documento CV subido exitosamente"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@aspirantes_bp.route("/api/uploads/<path:filename>", methods=["GET"])
@requiere_token
def descargar_archivo(filename):
    """
    GET /api/uploads/<filename>

    Servicio de descarga de archivos de currículum almacenados en el servidor.
    Protegido con @requiere_token para garantizar acceso solo al personal autorizado.
    """
    return send_from_directory(UPLOAD_FOLDER, filename)


@aspirantes_bp.route("/api/verificar-cedula/<cedula>", methods=["GET", "OPTIONS"])
def verificar_cedula(cedula):
    """
    GET /api/verificar-cedula/<cedula>

    Permite al portal público verificar la existencia previa de una cédula.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT cedula, nombre, apellido, telefono, correo, direccion
            FROM aspirantes WHERE cedula = %s
        """, (cedula,))
        aspirante = cur.fetchone()

        if aspirante:
            return jsonify({"existe": True, "datos": dict(aspirante)}), 200
        else:
            return jsonify({"existe": False}), 200
    finally:
        conn.close()
