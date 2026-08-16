# ============================================================
# SERVIDOR PRINCIPAL (app.py)
# Sistema SICS - Hotel Margarita Village
# Sistema de Información para la Captación y Selección de Talento Humano
#
# Este archivo es el punto de entrada del servidor Flask.
# Su única responsabilidad es inicializar la aplicación, configurar CORS
# y registrar todos los módulos (Blueprints) de la carpeta routes/.

import os
from flask import Flask
from flask_cors import CORS
from config import UPLOAD_FOLDER

# ------------------------------------------------------------
# INICIALIZACIÓN DE LA APLICACIÓN FLASK
# ------------------------------------------------------------
app = Flask(__name__)

# Habilita CORS para permitir al cliente React (puerto 5173) consumir la API (puerto 5000)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Asegura que el directorio de uploads exista al arrancar el servidor
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ------------------------------------------------------------
# REGISTRO DE BLUEPRINTS (Módulos de Rutas)
# ------------------------------------------------------------
from routes.auth_routes import auth_bp
from routes.dashboard_routes import dashboard_bp
from routes.candidatos_routes import candidatos_bp
from routes.aspirantes_routes import aspirantes_bp
from routes.evaluaciones_routes import evaluaciones_bp
from routes.preguntas_routes import preguntas_bp
from routes.examenes_routes import examenes_bp

app.register_blueprint(auth_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(candidatos_bp)
app.register_blueprint(aspirantes_bp)
app.register_blueprint(evaluaciones_bp)
app.register_blueprint(preguntas_bp)
app.register_blueprint(examenes_bp)

# ------------------------------------------------------------
# PUNTO DE ARRANQUE DEL SERVIDOR DE DESARROLLO
# ------------------------------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
