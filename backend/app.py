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
        if request.method == "OPTIONS":
            return f(*args, **kwargs)
            
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


# ============================================================
# ENDPOINTS PARA EL PANEL INTERNO (SPRINT 3 Y 4)
# ============================================================

# ------------------------------------------------------------
# GET /api/candidatos?q=<texto>
# Buscador maestro de candidatos (protegido por token).
# Permite a los reclutadores buscar por cédula, nombre o apellido.
# Usa ILIKE en PostgreSQL para hacer una búsqueda parcial insensible 
# a mayúsculas y minúsculas.
# ------------------------------------------------------------
@app.route("/api/candidatos", methods=["GET"])
@requiere_token
def buscar_candidatos():
    # Obtengo el término de búsqueda de los parámetros de la URL (?q=...)
    q = request.args.get("q", "").strip()
    
    with get_db() as conn:
        with conn.cursor() as cur:
            # Si no hay término de búsqueda, retorno lista vacía
            if not q:
                return jsonify([]), 200
                
            # Construyo el patrón de búsqueda para ILIKE usando % (comodín)
            # Ej: si q='perez', buscará '%perez%' (cualquier cosa antes o después)
            patron = f"%{q}%"
            
            # Ejecuto la consulta buscando coincidencias en cédula, nombre o apellido.
            # Uso un LEFT JOIN con postulaciones para obtener el cargo solicitado.
            # LIMIT 20 previene devolver demasiados resultados si la búsqueda es muy general.
            cur.execute("""
                SELECT a.cedula, a.nombre, a.apellido, 
                       p.empleo_solicitado, a.estado_actual
                FROM aspirantes a
                LEFT JOIN postulaciones p ON p.aspirante_id = a.id
                WHERE a.cedula ILIKE %s OR a.nombre ILIKE %s OR a.apellido ILIKE %s
                ORDER BY a.created_at DESC
                LIMIT 20
            """, (patron, patron, patron))
            
            filas = cur.fetchall()
            
    # Formateo los resultados en una lista de diccionarios JSON
    columnas = ["cedula", "nombre", "apellido", "empleo_solicitado", "estado_actual"]
    resultado = [dict(zip(columnas, fila)) for fila in filas]
    
    return jsonify(resultado), 200


# ------------------------------------------------------------
# GET /api/aspirantes/<cedula>/expediente
# Retorna el perfil COMPLETO del aspirante, incluyendo todas
# sus postulaciones, documentos, historial y evaluaciones.
# Esto es para la vista detallada del candidato en el dashboard.
# ------------------------------------------------------------
@app.route("/api/aspirantes/<cedula>/expediente", methods=["GET"])
@requiere_token
def obtener_expediente(cedula):
    with get_db() as conn:
        with conn.cursor() as cur:
            # 1. Obtengo los datos básicos del aspirante
            cur.execute("""
                SELECT id, cedula, nombre, apellido, correo, telefono,
                       direccion, fecha_nacimiento, formacion, experiencia,
                       estado_actual, edad, sexo, lugar_nacimiento, created_at
                FROM aspirantes
                WHERE cedula = %s
            """, (cedula,))
            
            fila_aspirante = cur.fetchone()
            if not fila_aspirante:
                return jsonify({"error": "Candidato no encontrado"}), 404
                
            columnas_asp = [
                "id", "cedula", "nombre", "apellido", "correo", "telefono",
                "direccion", "fecha_nacimiento", "formacion", "experiencia",
                "estado_actual", "edad", "sexo", "lugar_nacimiento", "created_at"
            ]
            aspirante = dict(zip(columnas_asp, fila_aspirante))
            if aspirante["fecha_nacimiento"]:
                aspirante["fecha_nacimiento"] = str(aspirante["fecha_nacimiento"])
            aspirante["created_at"] = str(aspirante["created_at"])
            
            aspirante_id = aspirante["id"]
            
            # 2. Obtengo las postulaciones asociadas a este aspirante
            cur.execute("""
                SELECT id, fecha_solicitud, empleo_solicitado, sueldo_aspira,
                       motivacion, habilidades, fortalezas, experiencia_ultimos_empleos,
                       referencias, disponibilidad_rotativa, disponibilidad_fines,
                       municipio, estado_civil, carga_familiar, medio_transporte,
                       trabaja_actualmente, monto_superior_aspira
                FROM postulaciones
                WHERE aspirante_id = %s
                ORDER BY fecha_solicitud DESC
            """, (aspirante_id,))
            
            columnas_post = [
                "id", "fecha_solicitud", "empleo_solicitado", "sueldo_aspira",
                "motivacion", "habilidades", "fortalezas", "experiencia_ultimos_empleos",
                "referencias", "disponibilidad_rotativa", "disponibilidad_fines",
                "municipio", "estado_civil", "carga_familiar", "medio_transporte",
                "trabaja_actualmente", "monto_superior_aspira"
            ]
            
            # Guardo todas las postulaciones en una lista
            postulaciones = []
            for fila in cur.fetchall():
                post = dict(zip(columnas_post, fila))
                if post["fecha_solicitud"]:
                    post["fecha_solicitud"] = str(post["fecha_solicitud"])
                postulaciones.append(post)
                
            # 3. Obtengo los documentos (ej. CV)
            cur.execute("""
                SELECT tipo, nombre_original, created_at
                FROM documentos
                WHERE aspirante_id = %s
            """, (aspirante_id,))
            
            documentos = []
            for fila in cur.fetchall():
                doc = {"tipo": fila[0], "nombre_original": fila[1], "fecha": str(fila[2])}
                documentos.append(doc)
                
            # Retorno todo agrupado en un solo objeto JSON estructurado
            return jsonify({
                "aspirante": aspirante,
                "postulaciones": postulaciones,
                "documentos": documentos
            }), 200


# ------------------------------------------------------------
# PUT /api/aspirantes/<cedula>/estado
# Permite al reclutador cambiar el estado del aspirante
# y registrar un motivo/nota en el historial (Memoria Institucional).
# ------------------------------------------------------------
@app.route("/api/aspirantes/<cedula>/estado", methods=["PUT"])
@requiere_token
def cambiar_estado(cedula):
    datos = request.get_json()
    nuevo_estado = datos.get("nuevo_estado")
    motivo = datos.get("motivo", "")
    notas = datos.get("notas", "")
    
    # Valido que el estado sea uno de los permitidos
    estados_validos = ['Postulado', 'En revisión', 'Citado', 'Seleccionado', 'Descartado']
    if nuevo_estado not in estados_validos:
        return jsonify({"error": "Estado inválido"}), 400
        
    if nuevo_estado == 'Descartado' and not motivo:
         return jsonify({"error": "Debe proveer un motivo de rechazo"}), 400

    # Obtengo el ID del usuario reclutador desde el token JWT
    user_id = request.usuario.get("sub")
    
    with get_db() as conn:
        with conn.cursor() as cur:
            # 1. Busco el ID del aspirante
            cur.execute("SELECT id FROM aspirantes WHERE cedula = %s", (cedula,))
            fila_asp = cur.fetchone()
            if not fila_asp:
                return jsonify({"error": "Aspirante no encontrado"}), 404
            aspirante_id = fila_asp[0]
            
            # 2. Actualizo el estado en la tabla principal
            cur.execute("""
                UPDATE aspirantes 
                SET estado_actual = %s 
                WHERE id = %s
            """, (nuevo_estado, aspirante_id))
            
            # 3. Busco el último cargo solicitado para registrarlo en el historial
            cur.execute("""
                SELECT empleo_solicitado 
                FROM postulaciones 
                WHERE aspirante_id = %s 
                ORDER BY fecha_solicitud DESC LIMIT 1
            """, (aspirante_id,))
            fila_post = cur.fetchone()
            cargo = fila_post[0] if fila_post else "N/A"
            
            # 4. Inserto el evento en la tabla historiales (Trazabilidad)
            cur.execute("""
                INSERT INTO historiales 
                    (aspirante_id, fecha, cargo_solicitado, veredicto, motivo_rechazo, notas, user_id)
                VALUES (%s, CURRENT_DATE, %s, %s, %s, %s, %s)
            """, (aspirante_id, cargo, nuevo_estado, motivo, notas, user_id))
            
            conn.commit()
            
    return jsonify({"mensaje": f"Estado actualizado a {nuevo_estado}"}), 200


# ------------------------------------------------------------
# GET /api/aspirantes/<cedula>/historial
# Retorna la línea de tiempo completa (Memoria Institucional)
# de todos los cambios de estado y veredictos del candidato.
# ------------------------------------------------------------
@app.route("/api/aspirantes/<cedula>/historial", methods=["GET"])
@requiere_token
def obtener_historial(cedula):
    with get_db() as conn:
        with conn.cursor() as cur:
            # Primero busco el ID del aspirante a partir de la cédula
            cur.execute("SELECT id FROM aspirantes WHERE cedula = %s", (cedula,))
            fila_asp = cur.fetchone()
            if not fila_asp:
                return jsonify({"error": "Aspirante no encontrado"}), 404
            aspirante_id = fila_asp[0]
            
            # Hago un JOIN con la tabla usuarios para obtener el nombre del
            # reclutador que hizo el cambio de estado.
            cur.execute("""
                SELECT h.fecha, h.cargo_solicitado, h.veredicto, 
                       h.motivo_rechazo, h.notas, u.nombre as reclutador
                FROM historiales h
                LEFT JOIN usuarios u ON h.user_id = u.id
                WHERE h.aspirante_id = %s
                ORDER BY h.created_at DESC
            """, (aspirante_id,))
            
            filas = cur.fetchall()
            
    columnas = ["fecha", "cargo_solicitado", "veredicto", "motivo_rechazo", "notas", "reclutador"]
    
    historial = []
    for fila in filas:
        item = dict(zip(columnas, fila))
        item["fecha"] = str(item["fecha"]) # Convertir fecha a string
        historial.append(item)
        
    return jsonify(historial), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
