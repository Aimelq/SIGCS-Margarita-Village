import bcrypt
from repositories.usuarios_repository import UsuariosRepository

class UsuariosService:
    def __init__(self):
        self.repository = UsuariosRepository()

    def listar_usuarios(self):
        return self.repository.get_all_users()

    def crear_usuario(self, datos):
        nombre = datos.get("nombre", "").strip()
        apellido = datos.get("apellido", "").strip()
        cedula = datos.get("cedula", "").strip()
        email = datos.get("email", "").strip().lower()
        clave = datos.get("clave", "")
        rol = datos.get("rol", "reclutador").strip().lower()
        activo = bool(datos.get("activo", True))

        if not nombre or not apellido:
            raise ValueError("El nombre y apellido son obligatorios")

        if not cedula:
            raise ValueError("La cédula de identidad es obligatoria")

        if not email:
            raise ValueError("El correo electrónico institucional es obligatorio")

        if not clave or len(clave) < 6:
            raise ValueError("La contraseña es obligatoria y debe tener al menos 6 caracteres")

        if rol not in ["reclutador", "administrador"]:
            raise ValueError("El rol debe ser 'reclutador' o 'administrador'")

        if self.repository.exists_email(email):
            raise ValueError(f"Ya existe un usuario registrado con el correo: {email}")

        if self.repository.exists_cedula(cedula):
            raise ValueError(f"Ya existe un usuario registrado con la cédula: {cedula}")

        password_hash = bcrypt.hashpw(clave.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        nuevo_usuario = self.repository.create_user(
            nombre=nombre,
            apellido=apellido,
            cedula=cedula,
            email=email,
            password_hash=password_hash,
            rol=rol,
            activo=activo
        )

        return nuevo_usuario

    def toggle_estado(self, user_id, activo, solicitante_id):
        user_id = int(user_id)
        solicitante_id = int(solicitante_id)

        # Validación de seguridad: no permitir auto-desactivación
        if user_id == solicitante_id and not activo:
            raise ValueError("No puedes desactivar tu propia cuenta de administrador mientras estés en sesión")

        usuario = self.repository.get_user_by_id(user_id)
        if not usuario:
            raise ValueError("Usuario no encontrado")

        self.repository.update_activo(user_id, activo)
        return {
            "mensaje": f"Usuario {'activado' if activo else 'desactivado'} con éxito",
            "usuario_id": user_id,
            "activo": activo
        }

    def cambiar_rol(self, user_id, nuevo_rol, solicitante_id):
        user_id = int(user_id)
        solicitante_id = int(solicitante_id)
        nuevo_rol = nuevo_rol.strip().lower()

        if nuevo_rol not in ["administrador", "reclutador"]:
            raise ValueError("El rol debe ser 'administrador' o 'reclutador'")

        if user_id == solicitante_id and nuevo_rol != "administrador":
            raise ValueError("No puedes degradar tu propia cuenta de Administrador mientras estés en sesión")

        usuario = self.repository.get_user_by_id(user_id)
        if not usuario:
            raise ValueError("Usuario no encontrado")

        self.repository.update_rol(user_id, nuevo_rol)
        return {
            "mensaje": f"Rol actualizado exitosamente a {nuevo_rol.capitalize()}",
            "usuario_id": user_id,
            "rol": nuevo_rol
        }
