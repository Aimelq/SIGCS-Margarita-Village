import psycopg2.extras
from db import get_db

class ExamenesRepository:
    def get_aspirante_by_cedula(self, cedula):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT id FROM aspirantes WHERE cedula = %s", (cedula,))
            return cur.fetchone()
        finally:
            conn.close()

    def get_random_preguntas_cerradas(self, limit=10):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT id FROM preguntas WHERE tipo IN ('Opción múltiple', 'Verdadero/Falso') ORDER BY RANDOM() LIMIT %s", (limit,))
            return cur.fetchall()
        finally:
            conn.close()

    def get_random_preguntas_abiertas(self, limit=3):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT id FROM preguntas WHERE tipo = 'Desarrollo abierto' ORDER BY RANDOM() LIMIT %s", (limit,))
            return cur.fetchall()
        finally:
            conn.close()

    def save_examen(self, aspirante_id, token, vencimiento, preguntas_seleccionadas):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                INSERT INTO examenes (aspirante_id, token_unico, fecha_vencimiento, estado)
                VALUES (%s, %s, %s, 'Emitido') RETURNING id
            """, (aspirante_id, token, vencimiento))
            examen_id = cur.fetchone()['id']

            for i, p in enumerate(preguntas_seleccionadas):
                cur.execute("""
                    INSERT INTO examen_preguntas (examen_id, pregunta_id, orden, puntaje_max)
                    VALUES (%s, %s, %s, 1.0)
                """, (examen_id, p['id'], i + 1))

            conn.commit()
            return examen_id
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def get_examenes_by_aspirante(self, aspirante_id):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT id, token_unico, fecha_emision, fecha_vencimiento, estado, puntaje
                FROM examenes WHERE aspirante_id = %s ORDER BY fecha_emision DESC
            """, (aspirante_id,))
            return cur.fetchall()
        finally:
            conn.close()

    def get_examen_by_token(self, token):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT e.id, e.estado, e.fecha_vencimiento, a.nombre, a.apellido
                FROM examenes e JOIN aspirantes a ON e.aspirante_id = a.id
                WHERE e.token_unico = %s
            """, (token,))
            return cur.fetchone()
        finally:
            conn.close()

    def get_preguntas_by_examen(self, examen_id):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT ep.id as examen_pregunta_id, p.texto, p.tipo, p.opciones_json, ep.orden
                FROM examen_preguntas ep
                JOIN preguntas p ON ep.pregunta_id = p.id
                WHERE ep.examen_id = %s
                ORDER BY ep.orden ASC
            """, (examen_id,))
            return cur.fetchall()
        finally:
            conn.close()

    def get_pregunta_with_respuesta(self, ep_id, examen_id):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT p.respuesta_correcta, ep.puntaje_max
                FROM examen_preguntas ep JOIN preguntas p ON ep.pregunta_id = p.id
                WHERE ep.id = %s AND ep.examen_id = %s
            """, (ep_id, examen_id))
            return cur.fetchone()
        finally:
            conn.close()

    def save_respuestas(self, examen_id, puntaje_total, respuestas_procesadas):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            for r in respuestas_procesadas:
                cur.execute("""
                    INSERT INTO respuestas_examen (examen_pregunta_id, respuesta, es_correcta, puntaje)
                    VALUES (%s, %s, %s, %s)
                """, (r['ep_id'], r['ans'], r['es_correcta'], r['pts']))

            cur.execute("UPDATE examenes SET estado = 'Finalizado', puntaje = %s WHERE id = %s", (puntaje_total, examen_id))
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def get_examen_details(self, examen_id):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT e.id, e.estado, e.puntaje, e.fecha_emision, e.fecha_vencimiento,
                       a.nombre, a.apellido, a.cedula
                FROM examenes e
                JOIN aspirantes a ON e.aspirante_id = a.id
                WHERE e.id = %s
            """, (examen_id,))
            return cur.fetchone()
        finally:
            conn.close()

    def get_respuestas_detalles(self, examen_id):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT 
                    ep.id as examen_pregunta_id,
                    ep.orden,
                    ep.puntaje_max,
                    p.texto as pregunta,
                    p.tipo,
                    p.opciones_json,
                    p.respuesta_correcta,
                    r.respuesta as respuesta_candidato,
                    r.es_correcta,
                    r.puntaje as puntaje_obtenido
                FROM examen_preguntas ep
                JOIN preguntas p ON ep.pregunta_id = p.id
                LEFT JOIN respuestas_examen r ON ep.id = r.examen_pregunta_id
                WHERE ep.examen_id = %s
                ORDER BY ep.orden ASC
            """, (examen_id,))
            return cur.fetchall()
        finally:
            conn.close()
