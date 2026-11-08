from functools import wraps
from flask import request, jsonify
import jwt
from config import JWT_SECRET

def requiere_token(f):
    """
    Decorador de seguridad para la protección declarativa de rutas privadas.
    """
    @wraps(f)
    def decorador(*args, **kwargs):
        if request.method == "OPTIONS":
            return f(*args, **kwargs)
            
        auth_header = request.headers.get("Authorization", "")
        
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Token de autenticación requerido"}), 401
        
        token = auth_header.split(" ", 1)[1]
        
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            request.usuario = payload
            
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Sesión expirada. Por favor inicie sesión nuevamente."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Token de autenticación inválido"}), 401
        
        return f(*args, **kwargs)
    return decorador


def requiere_admin(f):
    """
    Decorador para proteger rutas exclusivas de rol administrador.
    Verifica que el token pertenezca a un usuario con rol 'administrador'.
    """
    @wraps(f)
    def decorador(*args, **kwargs):
        if request.method == "OPTIONS":
            return f(*args, **kwargs)
        if not hasattr(request, "usuario") or not request.usuario:
            return jsonify({"error": "No autenticado"}), 401
        if request.usuario.get("rol") != "administrador":
            return jsonify({"error": "Acceso restringido: Se requieren permisos de Administrador"}), 403
        return f(*args, **kwargs)
    return decorador
