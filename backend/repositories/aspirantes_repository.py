import os
import json as json_module
import psycopg2.extras
from werkzeug.utils import secure_filename
from db import get_db
from config import UPLOAD_FOLDER


class AspirantesRepository:

    def get_perfil_by_cedula(self, cedula):
        """Retorna el perfil completo 360° uniendo aspirante con su última postulación."""
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
            return cur.fetchone()
        finally:
            conn.close()

    def get_documentos_by_aspirante_id(self, aspirante_id):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT
                    id,
                    nombre_original AS nombre_archivo,
                    substring(ruta_archivo from 'uploads/(.*)') AS nombre_real,
                    tipo,
                    uploaded_at AS created_at
                FROM documentos
                WHERE aspirante_id = %s
            """, (aspirante_id,))
            return cur.fetchall()
        finally:
            conn.close()

    def get_historial_by_cedula(self, cedula):
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
            return cur.fetchall()
        finally:
            conn.close()

    def get_ultima_postulacion_by_cedula(self, cedula):
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
            return cur.fetchone()
        finally:
            conn.close()

    def update_estado(self, postulacion_id, cedula, nuevo_estado, motivo_rechazo, notas, usuario_id):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
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
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def get_aspirante_id_by_cedula(self, cedula):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT id FROM aspirantes WHERE cedula = %s", (cedula,))
            return cur.fetchone()
        finally:
            conn.close()

    def _upsert_postulacion(self, cur, aspirante_id, f, disp_rot, disp_fin):
        """Realiza un INSERT...ON CONFLICT para la postulación del aspirante."""
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

    def crear_o_actualizar_aspirante(self, f):
        """
        Registra un nuevo aspirante o actualiza uno existente y crea su postulación.
        Retorna el ID del aspirante procesado.
        """
        cedula = f.get("cedula")
        disp_rot = True if str(f.get("disponibilidad_rotativa", "")).lower() in ['sí', 'si', 'true', '1'] else False
        disp_fin = True if str(f.get("disponibilidad_fines", "")).lower() in ['sí', 'si', 'true', '1'] else False

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

            self._upsert_postulacion(cur, aspirante_id, f, disp_rot, disp_fin)
            conn.commit()
            return aspirante_id
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def actualizar_aspirante(self, cedula, f):
        """Actualiza datos personales y agrega nueva postulación para aspirante existente."""
        disp_rot = True if str(f.get("disponibilidad_rotativa", "")).lower() in ['sí', 'si', 'true', '1'] else False
        disp_fin = True if str(f.get("disponibilidad_fines", "")).lower() in ['sí', 'si', 'true', '1'] else False

        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT id FROM aspirantes WHERE cedula = %s", (cedula,))
            existente = cur.fetchone()
            if not existente:
                raise ValueError("Aspirante no encontrado en el sistema")

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

            self._upsert_postulacion(cur, aspirante_id, f, disp_rot, disp_fin)
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def subir_cv(self, cedula, archivo_cv):
        """Guarda el archivo CV en disco y registra el documento en la BD."""
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT id FROM aspirantes WHERE cedula = %s", (cedula,))
            existente = cur.fetchone()
            if not existente:
                raise ValueError("Aspirante no encontrado")

            aspirante_id = existente["id"]
            nombre_seguro = secure_filename(archivo_cv.filename)
            ruta = os.path.join(UPLOAD_FOLDER, f"{cedula}_{nombre_seguro}")
            archivo_cv.save(ruta)

            cur.execute("""
                INSERT INTO documentos (aspirante_id, nombre_original, ruta_archivo, tipo)
                VALUES (%s, %s, %s, 'CV')
            """, (aspirante_id, nombre_seguro, ruta))

            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def verificar_cedula(self, cedula):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT cedula, nombre, apellido, telefono, correo, direccion
                FROM aspirantes WHERE cedula = %s
            """, (cedula,))
            return cur.fetchone()
        finally:
            conn.close()

    def get_evaluacion_resumen(self, aspirante_id):
        """Retorna la última evaluación conductual registrada para el candidato."""
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT e.*, u.nombre AS evaluador_nombre
                FROM evaluaciones e
                LEFT JOIN usuarios u ON u.id = e.user_id
                WHERE e.aspirante_id = %s
                ORDER BY e.created_at DESC
                LIMIT 1
            """, (aspirante_id,))
            return cur.fetchone()
        finally:
            conn.close()

    def get_examenes_resumen(self, aspirante_id):
        """Retorna el examen psicotécnico más reciente del candidato."""
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT ex.*
                FROM examenes ex
                WHERE ex.aspirante_id = %s
                ORDER BY ex.created_at DESC
                LIMIT 1
            """, (aspirante_id,))
            return cur.fetchone()
        finally:
            conn.close()

