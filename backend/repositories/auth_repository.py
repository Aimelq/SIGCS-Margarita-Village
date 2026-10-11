import psycopg2.extras
from db import get_db

class AuthRepository:
    def get_user_by_email(self, email):
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT id, email, nombre, password_hash, rol FROM usuarios WHERE email = %s",
                (email,)
            )
            return cur.fetchone()
        finally:
            conn.close()
