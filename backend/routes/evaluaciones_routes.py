from flask import Blueprint, request, jsonify
from auth_middleware import requiere_token
from services.evaluaciones_service import EvaluacionesService

evaluaciones_bp = Blueprint('evaluaciones', __name__)
evaluaciones_service = EvaluacionesService()


@evaluaciones_bp.route("/api/criterios", methods=["GET", "OPTIONS"])
@requiere_token
def obtener_criterios():
    """
    GET /api/criterios
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    criterios = evaluaciones_service.get_criterios()
    return jsonify(criterios), 200


@evaluaciones_bp.route("/api/evaluaciones/<cedula>", methods=["POST", "OPTIONS"])
@requiere_token
def crear_evaluacion(cedula):
    """
    POST /api/evaluaciones/<cedula>
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    datos = request.get_json() or {}
    criterios_evaluados = datos.get("criterios", [])
    notas_generales = datos.get("notas_generales", "")

    if not criterios_evaluados:
        return jsonify({"error": "Debe evaluar al menos un criterio de la lista"}), 400

    usuario_id = int(request.usuario.get("sub"))

    try:
        resultado = evaluaciones_service.procesar_evaluacion(
            cedula, usuario_id, criterios_evaluados, notas_generales
        )
        return jsonify(resultado), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@evaluaciones_bp.route("/api/evaluaciones/<cedula>", methods=["GET", "OPTIONS"])
@requiere_token
def obtener_evaluaciones(cedula):
    """
    GET /api/evaluaciones/<cedula>
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    resultado = evaluaciones_service.obtener_evaluaciones(cedula)
    return jsonify(resultado), 200
