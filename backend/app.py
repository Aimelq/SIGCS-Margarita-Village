import os
import psycopg
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from functools import wraps
from dotenv import load_dotenv
from flask import Flask, jsonify, request

from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
app.config['CORS_HEADERS'] = 'Content-Type'

CORS(app,
     resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}},
     supports_credentials=True,
     expose_headers=["Content-Type", "Authorization"])

@app.after_request
def add_cors_headers(response):
    response.headers.setdefault('Access-Control-Allow-Origin', 'http://localhost:5173')
    response.headers.setdefault('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.setdefault('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.setdefault('Access-Control-Allow-Credentials', 'true')
    return response

DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET = os.getenv("JWT_SECRET", "sigcs_margarita_village_secret_2026")

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads", "cvs")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

MAX_FILE_SIZE_MB = 5 * 1024 * 1024


def get_db():
    return psycopg.connect(DATABASE_URL)


# ------------------------------------------------------------
# DECORADOR: requiere_token
# Protege las rutas del panel interno. El frontend debe enviar
# el JWT en el header: Authorization: Bearer <token>
# Si el token falta, expiró o es inválido, retorna 401.
# ------------------------------------------------------------
def requiere_token(f):
    @wraps(f)
    def decorador(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Token requerido"}), 401
        token = auth_header.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            request.usuario = payload
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Sesión expirada. Vuelve a iniciar sesión."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Token inválido"}), 401
        return f(*args, **kwargs)
    return decorador


# ============================================================
# ENDPOINTS PÚBLICOS
# ============================================================

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "message": "Backend listo"})


@app.route("/api/ping-db")
def ping_db():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            resultado = cur.fetchone()
    return jsonify({"db": "conectada", "resultado": resultado[0]})


# ------------------------------------------------------------
# POST /api/auth/login
# El reclutador envía su email y contraseña.
# Verifico contra la tabla usuarios con bcrypt.
# Si es válido, genero un JWT de 8 horas y lo retorno.
# ------------------------------------------------------------
@app.route("/api/auth/login", methods=["POST"])
def login():
    datos = request.get_json(silent=True)
    if datos is None:
        return jsonify({"error": "JSON inválido o cabecera Content-Type incorrecta"}), 400

    email = datos.get("email", "").strip().lower()
    password = datos.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email y contraseña son requeridos"}), 400

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, email, nombre, password_hash, rol FROM usuarios WHERE email = %s",
                (email,)
            )
            fila = cur.fetchone()

    if not fila:
        return jsonify({"error": "Credenciales incorrectas"}), 401

    usuario_id, usuario_email, nombre, password_hash, rol = fila

    # Verifico que la contraseña ingresada coincide con el hash almacenado
    if not bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8")):
        return jsonify({"error": "Credenciales incorrectas"}), 401

    # Genero el token con expiración de 8 horas
    payload = {
        "sub": usuario_id,
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


# ------------------------------------------------------------
# GET /api/auth/me
# Retorna los datos del usuario autenticado según el token.
# El frontend lo usa al recargar para validar la sesión activa.
# ------------------------------------------------------------
@app.route("/api/auth/me", methods=["GET"])
@requiere_token
def me():
    return jsonify(request.usuario), 200


# ============================================================
# ENDPOINTS DEL DASHBOARD (protegidos)
# ============================================================

# ------------------------------------------------------------
# GET /api/dashboard/metricas
# Retorna los 4 indicadores visuales de las cards del dashboard.
# ------------------------------------------------------------
@app.route("/api/dashboard/metricas", methods=["GET"])
@requiere_token
def metricas():
    with get_db() as conn:
        with conn.cursor() as cur:
            # Postulados esta semana (últimos 7 días)
            cur.execute("""
                SELECT COUNT(*) FROM postulaciones
                WHERE created_at >= NOW() - INTERVAL '7 days'
            """)
            postulados_semana = cur.fetchone()[0]

            # Total de aspirantes en el sistema
            cur.execute("SELECT COUNT(*) FROM aspirantes")
            total_aspirantes = cur.fetchone()[0]

            # En revisión (entrevistados / citados)
            cur.execute("""
                SELECT COUNT(*) FROM aspirantes
                WHERE estado_actual IN ('En revisión', 'Citado')
            """)
            en_revision = cur.fetchone()[0]

            # Aptos (seleccionados)
            cur.execute("""
                SELECT COUNT(*) FROM aspirantes
                WHERE estado_actual = 'Seleccionado'
            """)
            aptos = cur.fetchone()[0]

    return jsonify({
        "postulados_semana": postulados_semana,
        "total_aspirantes": total_aspirantes,
        "en_revision": en_revision,
        "aptos": aptos
    }), 200


# ------------------------------------------------------------
# GET /api/dashboard/recientes
# Retorna los últimos 10 aspirantes registrados con su info
# básica para poblar la tabla del dashboard.
# ------------------------------------------------------------
@app.route("/api/dashboard/recientes", methods=["GET"])
@requiere_token
def recientes():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT a.cedula, a.nombre, a.apellido,
                       p.empleo_solicitado, a.estado_actual, a.created_at
                FROM aspirantes a
                LEFT JOIN postulaciones p ON p.aspirante_id = a.id
                ORDER BY a.created_at DESC
                LIMIT 10
            """)
            filas = cur.fetchall()

    columnas = ["cedula", "nombre", "apellido", "empleo_solicitado", "estado_actual", "created_at"]
    resultado = []
    for fila in filas:
        item = dict(zip(columnas, fila))
        item["created_at"] = str(item["created_at"])[:10]  # Solo fecha YYYY-MM-DD
        resultado.append(item)

    return jsonify(resultado), 200


# ============================================================
# ENDPOINTS PÚBLICOS: Portal de Aspirantes (sin cambios)
# ============================================================

@app.route("/api/aspirantes/<cedula>", methods=["GET"])
def buscar_aspirante(cedula):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, cedula, nombre, apellido, correo, telefono,
                       direccion, fecha_nacimiento, formacion, experiencia,
                       estado_actual, edad, sexo, lugar_nacimiento
                FROM aspirantes
                WHERE cedula = %s
                """,
                (cedula,)
            )
            fila = cur.fetchone()

    if fila is None:
        return jsonify({"existe": False, "mensaje": "Cedula no registrada, puede proceder con el registro"}), 404

    columnas = [
        "id", "cedula", "nombre", "apellido", "correo", "telefono",
        "direccion", "fecha_nacimiento", "formacion", "experiencia",
        "estado_actual", "edad", "sexo", "lugar_nacimiento"
    ]
    datos = dict(zip(columnas, fila))

    if datos["fecha_nacimiento"]:
        datos["fecha_nacimiento"] = str(datos["fecha_nacimiento"])

    datos["existe"] = True
    return jsonify(datos), 200


@app.route("/api/aspirantes", methods=["POST"])
def registrar_aspirante():
    datos = request.get_json()

    cedula = datos.get("cedula", "").strip()
    if not cedula:
        return jsonify({"error": "La cedula es obligatoria"}), 400

    nombre = datos.get("nombre", "").strip()
    apellido = datos.get("apellido", "").strip()
    if not nombre or not apellido:
        return jsonify({"error": "El nombre y apellido son obligatorios"}), 400

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM aspirantes WHERE cedula = %s", (cedula,))
            if cur.fetchone():
                return jsonify({"error": "Esta cedula ya esta registrada en el sistema"}), 409

            cur.execute(
                """
                INSERT INTO aspirantes
                    (cedula, nombre, apellido, correo, telefono,
                     direccion, fecha_nacimiento, formacion, experiencia,
                     edad, sexo, lugar_nacimiento)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    cedula, nombre, apellido,
                    datos.get("correo"), datos.get("telefono"),
                    datos.get("direccion"), datos.get("fecha_nacimiento") or None,
                    datos.get("formacion"), datos.get("experiencia"),
                    datos.get("edad"), datos.get("sexo"), datos.get("lugar_nacimiento"),
                )
            )
            aspirante_id = cur.fetchone()[0]

            cur.execute(
                """
                INSERT INTO postulaciones
                    (aspirante_id, empleo_solicitado, sueldo_aspira, motivacion,
                     habilidades, fortalezas, disponibilidad_rotativa,
                     disponibilidad_fines, municipio, estado_civil,
                     medio_transporte, trabaja_actualmente, monto_superior_aspira,
                     carga_familiar, data_bancaria, referencias, experiencia_ultimos_empleos)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    aspirante_id,
                    datos.get("empleo_solicitado"), datos.get("sueldo_aspira"),
                    datos.get("motivacion"), datos.get("habilidades"),
                    datos.get("fortalezas"), datos.get("disponibilidad_rotativa"),
                    datos.get("disponibilidad_fines"), datos.get("municipio"),
                    datos.get("estado_civil"), datos.get("medio_transporte"),
                    datos.get("trabaja_actualmente"), datos.get("monto_superior_aspira"),
                    datos.get("carga_familiar"), datos.get("data_bancaria"),
                    datos.get("referencias"), datos.get("experiencia_ultimos_empleos"),
                )
            )
            conn.commit()

    return jsonify({"mensaje": "Aspirante registrado exitosamente", "id": aspirante_id}), 201


@app.route("/api/aspirantes/<cedula>", methods=["PUT"])
def actualizar_aspirante(cedula):
    datos = request.get_json()

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM aspirantes WHERE cedula = %s", (cedula,))
            fila = cur.fetchone()
            if not fila:
                return jsonify({"error": "No se encontro ningun aspirante con esa cedula"}), 404

            cur.execute(
                """
                UPDATE aspirantes SET
                    correo      = COALESCE(%s, correo),
                    telefono    = COALESCE(%s, telefono),
                    direccion   = COALESCE(%s, direccion),
                    formacion   = COALESCE(%s, formacion),
                    experiencia = COALESCE(%s, experiencia),
                    edad        = COALESCE(%s, edad),
                    sexo        = COALESCE(%s, sexo),
                    lugar_nacimiento = COALESCE(%s, lugar_nacimiento)
                WHERE cedula = %s
                """,
                (
                    datos.get("correo"), datos.get("telefono"),
                    datos.get("direccion"), datos.get("formacion"),
                    datos.get("experiencia"), datos.get("edad"),
                    datos.get("sexo"), datos.get("lugar_nacimiento"),
                    cedula,
                )
            )
            conn.commit()

    return jsonify({"mensaje": "Datos actualizados correctamente"}), 200


@app.route("/api/aspirantes/<cedula>/cv", methods=["POST"])
def subir_cv(cedula):
    if "archivo" not in request.files:
        return jsonify({"error": "No se envio ningun archivo en el campo 'archivo'"}), 400

    archivo = request.files["archivo"]

    if archivo.filename == "":
        return jsonify({"error": "El archivo no tiene nombre"}), 400

    if not archivo.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Solo se aceptan archivos en formato PDF"}), 400

    contenido = archivo.read()
    if len(contenido) > MAX_FILE_SIZE_MB:
        return jsonify({"error": "El archivo supera el limite de 5 MB"}), 400

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM aspirantes WHERE cedula = %s", (cedula,))
            fila = cur.fetchone()
            if not fila:
                return jsonify({"error": "No se encontro ningun aspirante con esa cedula"}), 404

            aspirante_id = fila[0]
            nombre_guardado = f"{cedula}_cv.pdf"
            ruta_completa = os.path.join(UPLOAD_FOLDER, nombre_guardado)

            with open(ruta_completa, "wb") as f:
                f.write(contenido)

            cur.execute(
                "DELETE FROM documentos WHERE aspirante_id = %s AND tipo = 'cv'",
                (aspirante_id,)
            )
            cur.execute(
                """
                INSERT INTO documentos (aspirante_id, tipo, nombre_original, ruta_archivo)
                VALUES (%s, 'cv', %s, %s)
                """,
                (aspirante_id, archivo.filename, ruta_completa)
            )
            conn.commit()

    return jsonify({"mensaje": "CV subido y registrado correctamente"}), 201


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
