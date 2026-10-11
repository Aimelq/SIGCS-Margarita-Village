import psycopg2.extras
from db import get_db

class EvaluacionesRepository:
    def get_active_criterios(self):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT id, nombre, descripcion, tipo
                FROM criterios
                WHERE activo = true
                ORDER BY id ASC
            """)
            return cur.fetchall()
        finally:
            conn.close()
            
    def get_aspirante_by_cedula(self, cedula):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT id FROM aspirantes WHERE cedula = %s", (cedula,))
            return cur.fetchone()
        finally:
            conn.close()

    def get_criterio_name(self, criterio_id):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT nombre FROM criterios WHERE id = %s", (criterio_id,))
            return cur.fetchone()
        finally:
            conn.close()

    def save_evaluacion(self, aspirante_id, usuario_id, elegible_count, no_elegible_count, veredicto, justificacion, notas_generales, criterios_evaluados, nuevo_estado):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Guardar evaluación principal
            cur.execute("""
                INSERT INTO evaluaciones
                    (aspirante_id, user_id, elegible_count, no_elegible_count,
                     veredicto, justificacion_automatizada, notas)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                aspirante_id, usuario_id,
                elegible_count, no_elegible_count,
                veredicto, justificacion, notas_generales
            ))
            evaluacion_id = cur.fetchone()["id"]

            # Guardar los detalles por criterio
            for item in criterios_evaluados:
                cur.execute("""
                    INSERT INTO evaluacion_criterios
                        (evaluacion_id, criterio_id, decision, comentario)
                    VALUES (%s, %s, %s, %s)
                """, (
                    evaluacion_id,
                    item.get("criterio_id"),
                    item.get("decision"),
                    item.get("comentario", "")
                ))

            # Obtener postulacion
            cur.execute("""
                SELECT p.id, a.estado_actual AS estado FROM postulaciones p JOIN aspirantes a ON a.id = p.aspirante_id
                WHERE aspirante_id = %s
                ORDER BY fecha_solicitud DESC LIMIT 1
            """, (aspirante_id,))
            postulacion = cur.fetchone()

            if postulacion:
                postulacion_id = postulacion["id"]

                cur.execute(
                    "UPDATE aspirantes SET estado_actual = %s WHERE id = (SELECT aspirante_id FROM postulaciones WHERE id = %s)",
                    (nuevo_estado, postulacion_id)
                )

                cur.execute("""
                    INSERT INTO historiales
                        (aspirante_id, fecha, cargo_solicitado, veredicto, motivo_rechazo, notas, user_id)
                    VALUES
                        (%s, CURRENT_DATE, COALESCE((SELECT empleo_solicitado FROM postulaciones WHERE id = %s), 'No especificado'), %s, %s, %s, %s)
                """, (
                    aspirante_id,
                    postulacion_id,
                    nuevo_estado,
                    justificacion if veredicto == "No Apto" else "",
                    f"Evaluación de entrevista registrada. {notas_generales}",
                    usuario_id
                ))

            conn.commit()
            return evaluacion_id
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def get_evaluaciones_by_cedula(self, cedula):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT
                    e.id, e.veredicto, e.elegible_count, e.no_elegible_count,
                    e.justificacion_automatizada, e.notas, e.created_at,
                    u.nombre as entrevistador
                FROM evaluaciones e
                JOIN aspirantes a ON a.id = e.aspirante_id
                JOIN usuarios u ON u.id = e.user_id
                WHERE a.cedula = %s
                ORDER BY e.created_at DESC
            """, (cedula,))
            evaluaciones = cur.fetchall()

            resultado = []
            for ev in evaluaciones:
                cur.execute("""
                    SELECT
                        c.nombre as criterio,
                        c.descripcion,
                        ec.decision,
                        ec.comentario
                    FROM evaluacion_criterios ec
                    JOIN criterios c ON c.id = ec.criterio_id
                    WHERE ec.evaluacion_id = %s
                    ORDER BY c.id ASC
                """, (ev["id"],))
                criterios_detalle = cur.fetchall()

                ev_dict = dict(ev)
                ev_dict["criterios"] = list(criterios_detalle)
                resultado.append(ev_dict)

            return resultado
        finally:
            conn.close()
