import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from config import JWT_SECRET
from repositories.auth_repository import AuthRepository

class AuthService:
    def __init__(self):
        self.repository = AuthRepository()

    def login(self, email, password):
        if not email or not password:
            raise ValueError("El correo electrónico y la contraseña son obligatorios")

        fila = self.repository.get_user_by_email(email)
        if not fila:
            raise ValueError("Credenciales de acceso incorrectas")

        usuario_id, usuario_email, nombre, password_hash, rol = fila

        if not bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8")):
            raise ValueError("Credenciales de acceso incorrectas")

        payload = {
            "sub": str(usuario_id),
            "email": usuario_email,
            "nombre": nombre,
            "rol": rol,
            "exp": datetime.now(timezone.utc) + timedelta(hours=8)
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

        return {
            "token": token,
            "usuario": {
                "id": usuario_id,
                "email": usuario_email,
                "nombre": nombre,
                "rol": rol
            }
        }
