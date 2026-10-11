from flask import Blueprint, request, jsonify
from auth_middleware import requiere_token
from services.auth_service import AuthService

auth_bp = Blueprint('auth', __name__)
auth_service = AuthService()

@auth_bp.route("/api/auth/login", methods=["POST", "OPTIONS"])
def login():
    """
    POST /api/auth/login
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    datos = request.get_json() or {}
    email = datos.get("email", "").strip()
    password = datos.get("password", "")

    try:
        resultado = auth_service.login(email, password)
        return jsonify(resultado), 200
    except ValueError as e:
        msg = str(e)
        if "obligatorios" in msg:
            return jsonify({"error": msg}), 400
        return jsonify({"error": msg}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route("/api/auth/me", methods=["GET", "OPTIONS"])
@requiere_token
def get_me():
    """
    GET /api/auth/me
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    return jsonify({
        "usuario": {
            "id": request.usuario.get("sub"),
            "email": request.usuario.get("email"),
            "nombre": request.usuario.get("nombre"),
            "rol": request.usuario.get("rol")
        }
    }), 200
