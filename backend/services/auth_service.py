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

        usuario = self.repository.get_user_by_email(email)
        if not usuario:
            raise ValueError("Credenciales de acceso incorrectas")

        # Comprobación de estado activo / inactivo
        if not usuario.get("activo", True):
            raise PermissionError("Tu cuenta ha sido desactivada por un administrador. Comunícate con Recursos Humanos.")

        password_hash = usuario["password_hash"]
        if not bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8")):
            raise ValueError("Credenciales de acceso incorrectas")

        usuario_id = usuario["id"]
        nombre_completo = f"{usuario['nombre']} {usuario.get('apellido', '')}".strip()

        payload = {
            "sub": str(usuario_id),
            "email": usuario["email"],
            "nombre": nombre_completo,
            "rol": usuario["rol"],
            "exp": datetime.now(timezone.utc) + timedelta(hours=8)
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

        return {
            "token": token,
            "usuario": {
                "id": usuario_id,
                "email": usuario["email"],
                "nombre": nombre_completo,
                "rol": usuario["rol"]
            }
        }

    def cambiar_password(self, user_id, password_actual, password_nueva, confirmar_password):
        if not password_actual or not password_nueva:
            raise ValueError("La contraseña actual y la nueva contraseña son obligatorias")

        if len(password_nueva) < 6:
            raise ValueError("La nueva contraseña debe tener al menos 6 caracteres")

        if password_nueva != confirmar_password:
            raise ValueError("La nueva contraseña y la confirmación no coinciden")

        usuario = self.repository.get_user_by_id(user_id)
        if not usuario:
            raise ValueError("Usuario no encontrado")

        if not bcrypt.checkpw(password_actual.encode("utf-8"), usuario["password_hash"].encode("utf-8")):
            raise ValueError("La contraseña actual ingresada es incorrecta")

        nuevo_hash = bcrypt.hashpw(password_nueva.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        self.repository.update_password(user_id, nuevo_hash)
        return {"mensaje": "Contraseña actualizada exitosamente"}
