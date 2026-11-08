import psycopg2.extras
from db import get_db

class AuthRepository:
    def get_user_by_email(self, email):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(
                """
                SELECT id, email, nombre, COALESCE(apellido, '') as apellido,
                       COALESCE(cedula, '') as cedula, password_hash, rol,
                       COALESCE(activo, true) as activo
                FROM usuarios
                WHERE email = %s
                """,
                (email,)
            )
            return cur.fetchone()
        finally:
            conn.close()

    def get_user_by_id(self, user_id):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(
                """
                SELECT id, email, nombre, COALESCE(apellido, '') as apellido,
                       COALESCE(cedula, '') as cedula, password_hash, rol,
                       COALESCE(activo, true) as activo
                FROM usuarios
                WHERE id = %s
                """,
                (user_id,)
            )
            return cur.fetchone()
        finally:
            conn.close()

    def update_password(self, user_id, new_password_hash):
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "UPDATE usuarios SET password_hash = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                (new_password_hash, user_id)
            )
            conn.commit()
            return True
        finally:
            conn.close()
