from flask import Blueprint, request, jsonify
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
import psycopg2.extras
from db import get_db
from config import JWT_SECRET
from auth_middleware import requiere_token

auth_bp = Blueprint('auth', __name__)


@auth_bp.route("/api/auth/login", methods=["POST", "OPTIONS"])
def login():
    """
    POST /api/auth/login

    Endpoint de autenticación para reclutadores y administradores del hotel.
    Recibe las credenciales en formato JSON, verifica la existencia del usuario
    y valida la contraseña encriptada usando la librería Bcrypt.

    Si las credenciales son válidas, emite un token JWT con vigencia de 8 horas.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    datos = request.get_json() or {}
    email = datos.get("email", "").strip()
    password = datos.get("password", "")

    if not email or not password:
        return jsonify({"error": "El correo electrónico y la contraseña son obligatorios"}), 400

    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, email, nombre, password_hash, rol FROM usuarios WHERE email = %s",
            (email,)
        )
        fila = cur.fetchone()

        if not fila:
            return jsonify({"error": "Credenciales de acceso incorrectas"}), 401

        usuario_id, usuario_email, nombre, password_hash, rol = fila

        if not bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8")):
            return jsonify({"error": "Credenciales de acceso incorrectas"}), 401

        payload = {
            "sub": str(usuario_id),
            "email": usuario_email,
            "nombre": nombre,
            "rol": rol,
            "exp": datetime.now(timezone.utc) + timedelta(hours=8)
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

        return jsonify({
            "token": token,
            "usuario": {
                "id": usuario_id,
                "email": usuario_email,
                "nombre": nombre,
                "rol": rol
            }
        }), 200

    finally:
        conn.close()


@auth_bp.route("/api/auth/me", methods=["GET", "OPTIONS"])
@requiere_token
def get_me():
    """
    GET /api/auth/me

    Verifica la validez del token presentado en el encabezado de la petición
    y retorna la información del usuario en sesión.
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
