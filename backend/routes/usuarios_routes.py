from flask import Blueprint, request, jsonify
from auth_middleware import requiere_token, requiere_admin
from services.usuarios_service import UsuariosService

usuarios_bp = Blueprint('usuarios', __name__)
usuarios_service = UsuariosService()


@usuarios_bp.route("/api/usuarios", methods=["GET", "OPTIONS"])
@requiere_token
@requiere_admin
def listar_usuarios():
    """
    GET /api/usuarios
    Lista todos los usuarios del sistema. Exclusivo para administradores.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    try:
        usuarios = usuarios_service.listar_usuarios()
        return jsonify(usuarios), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@usuarios_bp.route("/api/usuarios", methods=["POST", "OPTIONS"])
@requiere_token
@requiere_admin
def crear_usuario():
    """
    POST /api/usuarios
    Crea un nuevo usuario (reclutador o administrador) en el sistema.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    datos = request.get_json() or {}

    try:
        nuevo = usuarios_service.crear_usuario(datos)
        return jsonify({
            "mensaje": "Usuario creado exitosamente",
            "usuario": nuevo
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@usuarios_bp.route("/api/usuarios/<int:user_id>/estado", methods=["PATCH", "OPTIONS"])
@requiere_token
@requiere_admin
def cambiar_estado(user_id):
    """
    PATCH /api/usuarios/<id>/estado
    Activa o desactiva la cuenta de un usuario.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    datos = request.get_json() or {}
    if "activo" not in datos:
        return jsonify({"error": "El campo 'activo' es requerido (true o false)"}), 400

    solicitante_id = int(request.usuario.get("sub"))

    try:
        resultado = usuarios_service.toggle_estado(user_id, datos["activo"], solicitante_id)
        return jsonify(resultado), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
