import json as json_module
import psycopg2.extras
from db import get_db


class PreguntasRepository:

    def get_all(self, tipo_filtro=None):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
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
            return cur.fetchall()
        finally:
            conn.close()

    def get_by_id(self, pregunta_id):
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
            return cur.fetchone()
        finally:
            conn.close()

    def create(self, texto, tipo, opciones_json, respuesta_correcta, usuario_id):
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
            return nueva
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def update(self, pregunta_id, campos, valores):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(
                f"UPDATE preguntas SET {', '.join(campos)} WHERE id = %s RETURNING id, texto, tipo, opciones_json, respuesta_correcta, updated_at",
                valores
            )
            actualizada = dict(cur.fetchone())
            conn.commit()
            return actualizada
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def is_in_use(self, pregunta_id):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT COUNT(*) AS cnt FROM examen_preguntas WHERE pregunta_id = %s", (pregunta_id,))
            uso = cur.fetchone()
            return uso and uso['cnt'] > 0
        finally:
            conn.close()

    def delete(self, pregunta_id):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("DELETE FROM preguntas WHERE id = %s", (pregunta_id,))
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
