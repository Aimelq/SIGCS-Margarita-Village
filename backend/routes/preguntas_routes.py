from flask import Blueprint, request, jsonify
from auth_middleware import requiere_token
from services.preguntas_service import PreguntasService

preguntas_bp = Blueprint('preguntas', __name__)
preguntas_service = PreguntasService()


@preguntas_bp.route('/api/preguntas', methods=['GET', 'OPTIONS'])
@requiere_token
def listar_preguntas():
    """
    GET /api/preguntas
    Retorna la lista completa del banco de preguntas, con filtro opcional por tipo.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    tipo_filtro = request.args.get('tipo', '').strip()

    try:
        resultado = preguntas_service.listar_preguntas(tipo_filtro or None)
        return jsonify(resultado), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@preguntas_bp.route('/api/preguntas', methods=['POST', 'OPTIONS'])
@requiere_token
def crear_pregunta():
    """
    POST /api/preguntas
    Crea un nuevo reactivo en el banco de preguntas.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Se esperaba un cuerpo JSON en la petición.'}), 400

    usuario_id = request.usuario.get("sub") or request.usuario.get("id")

    try:
        nueva = preguntas_service.crear_pregunta(data, usuario_id)
        return jsonify(nueva), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@preguntas_bp.route('/api/preguntas/<int:pregunta_id>', methods=['GET', 'OPTIONS'])
@requiere_token
def obtener_pregunta(pregunta_id):
    """
    GET /api/preguntas/<id>
    Retorna el detalle de una pregunta específica del banco.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    try:
        resultado = preguntas_service.obtener_pregunta(pregunta_id)
        return jsonify(resultado), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@preguntas_bp.route('/api/preguntas/<int:pregunta_id>', methods=['PUT', 'OPTIONS'])
@requiere_token
def editar_pregunta(pregunta_id):
    """
    PUT /api/preguntas/<id>
    Actualiza los datos de una pregunta existente.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Se esperaba un cuerpo JSON en la petición.'}), 400

    try:
        actualizada = preguntas_service.editar_pregunta(pregunta_id, data)
        return jsonify(actualizada), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@preguntas_bp.route('/api/preguntas/<int:pregunta_id>', methods=['DELETE', 'OPTIONS'])
@requiere_token
def eliminar_pregunta(pregunta_id):
    """
    DELETE /api/preguntas/<id>
    Elimina permanentemente una pregunta del banco.
    Retorna HTTP 409 si está asignada a un examen activo.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    try:
        preguntas_service.eliminar_pregunta(pregunta_id)
        return jsonify({'mensaje': 'Pregunta eliminada correctamente del banco.'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except PermissionError as e:
        return jsonify({'error': str(e)}), 409
    except Exception as e:
        return jsonify({'error': str(e)}), 500
