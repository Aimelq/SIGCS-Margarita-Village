import psycopg2.extras
from db import get_db

class UsuariosRepository:
    def get_all_users(self):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT
                    id,
                    email,
                    nombre,
                    COALESCE(apellido, '') as apellido,
                    COALESCE(cedula, '') as cedula,
                    rol,
                    COALESCE(activo, true) as activo,
                    created_at,
                    updated_at
                FROM usuarios
                ORDER BY id ASC
            """)
            return cur.fetchall()
        finally:
            conn.close()

    def get_user_by_id(self, user_id):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT id, email, nombre, COALESCE(apellido, '') as apellido,
                       COALESCE(cedula, '') as cedula, rol, COALESCE(activo, true) as activo
                FROM usuarios
                WHERE id = %s
            """, (user_id,))
            return cur.fetchone()
        finally:
            conn.close()

    def exists_email(self, email, exclude_id=None):
        conn = get_db()
        try:
            cur = conn.cursor()
            if exclude_id:
                cur.execute("SELECT id FROM usuarios WHERE email = %s AND id != %s", (email, exclude_id))
            else:
                cur.execute("SELECT id FROM usuarios WHERE email = %s", (email,))
            return cur.fetchone() is not None
        finally:
            conn.close()

    def exists_cedula(self, cedula, exclude_id=None):
        if not cedula:
            return False
        conn = get_db()
        try:
            cur = conn.cursor()
            if exclude_id:
                cur.execute("SELECT id FROM usuarios WHERE cedula = %s AND id != %s", (cedula, exclude_id))
            else:
                cur.execute("SELECT id FROM usuarios WHERE cedula = %s", (cedula,))
            return cur.fetchone() is not None
        finally:
            conn.close()

    def create_user(self, nombre, apellido, cedula, email, password_hash, rol, activo=True):
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                INSERT INTO usuarios (nombre, apellido, cedula, email, password_hash, rol, activo)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, nombre, apellido, cedula, email, rol, activo, created_at
            """, (nombre, apellido, cedula, email, password_hash, rol, activo))
            nuevo = cur.fetchone()
            conn.commit()
            return nuevo
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def update_activo(self, user_id, activo):
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "UPDATE usuarios SET activo = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                (activo, user_id)
            )
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def update_rol(self, user_id, nuevo_rol):
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "UPDATE usuarios SET rol = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                (nuevo_rol, user_id)
            )
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
