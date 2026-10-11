from flask import Blueprint, request, jsonify
from auth_middleware import requiere_token
from services.examenes_service import ExamenesService

examenes_bp = Blueprint('examenes', __name__)
examenes_service = ExamenesService()


@examenes_bp.route('/api/aspirantes/<cedula>/examenes', methods=['POST', 'OPTIONS'])
@requiere_token
def generar_examen(cedula):
    """
    POST /api/aspirantes/<cedula>/examenes
    """
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        resultado = examenes_service.generar_examen(cedula)
        return jsonify(resultado), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@examenes_bp.route('/api/aspirantes/<cedula>/examenes', methods=['GET', 'OPTIONS'])
@requiere_token
def listar_examenes(cedula):
    """
    GET /api/aspirantes/<cedula>/examenes
    """
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        resultado = examenes_service.listar_examenes(cedula)
        return jsonify(resultado), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@examenes_bp.route('/api/evaluacion/<token>', methods=['GET', 'OPTIONS'])
def obtener_examen_publico(token):
    """
    GET /api/evaluacion/<token>
    """
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        resultado = examenes_service.obtener_examen_publico(token)
        return jsonify(resultado), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@examenes_bp.route('/api/evaluacion/<token>', methods=['POST', 'OPTIONS'])
def responder_examen_publico(token):
    """
    POST /api/evaluacion/<token>
    """
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    datos = request.get_json() or {}
    respuestas = datos.get('respuestas', [])

    try:
        resultado = examenes_service.responder_examen(token, respuestas)
        return jsonify(resultado), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@examenes_bp.route('/api/examenes/<int:examen_id>/respuestas', methods=['GET', 'OPTIONS'])
@requiere_token
def obtener_respuestas_examen(examen_id):
    """
    GET /api/examenes/<int:examen_id>/respuestas
    """
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        resultado = examenes_service.obtener_respuestas_examen(examen_id)
        return jsonify(resultado), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
