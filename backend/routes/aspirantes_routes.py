from flask import Blueprint, request, jsonify, send_from_directory, send_file
from auth_middleware import requiere_token
from services.aspirantes_service import AspirantesService
from config import UPLOAD_FOLDER

aspirantes_bp = Blueprint('aspirantes', __name__)
aspirantes_service = AspirantesService()


@aspirantes_bp.route("/api/aspirantes/<cedula>/ficha-pdf", methods=["GET", "OPTIONS"])
@requiere_token
def descargar_ficha_pdf(cedula):
    """
    GET /api/aspirantes/<cedula>/ficha-pdf
    Genera y descarga la Ficha Técnica / Solicitud de Empleo oficial en PDF.
    Accesible en cualquier fase (antes o después de entrevistas/pruebas).
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    try:
        pdf_buffer = aspirantes_service.generar_ficha_pdf(cedula)
        filename = f"Ficha_Candidato_{cedula}.pdf"
        return send_file(
            pdf_buffer,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=filename
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Error al generar la ficha PDF: {str(e)}"}), 500


@aspirantes_bp.route("/api/aspirantes/<cedula>", methods=["GET", "OPTIONS"])
def obtener_aspirante(cedula):

    """
    GET /api/aspirantes/<cedula>
    Retorna el perfil integral 360° de un candidato.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    try:
        perfil = aspirantes_service.get_perfil(cedula)
        return jsonify(perfil), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


@aspirantes_bp.route("/api/aspirantes/<cedula>/historial", methods=["GET", "OPTIONS"])
@requiere_token
def obtener_historial(cedula):
    """
    GET /api/aspirantes/<cedula>/historial
    Retorna la línea de tiempo histórica de decisiones sobre el candidato.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    historial = aspirantes_service.get_historial(cedula)
    return jsonify(historial), 200


@aspirantes_bp.route("/api/aspirantes/<cedula>/estado", methods=["PUT", "OPTIONS"])
@requiere_token
def actualizar_estado(cedula):
    """
    PUT /api/aspirantes/<cedula>/estado
    Actualiza manualmente el estado del proceso y registra traza en la Memoria Institucional.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    datos = request.get_json() or {}
    nuevo_estado = datos.get("estado")
    notas = datos.get("notas", "")
    motivo_rechazo = datos.get("motivo_rechazo", "")
    usuario_id = request.usuario.get("sub")

    try:
        aspirantes_service.actualizar_estado(cedula, nuevo_estado, notas, motivo_rechazo, usuario_id)
        return jsonify({"mensaje": "Estado actualizado correctamente"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@aspirantes_bp.route("/api/aspirantes", methods=["POST", "OPTIONS"])
def crear_aspirante():
    """
    POST /api/aspirantes
    Registra o actualiza la postulación de un aspirante desde el formulario público.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    f = request.get_json() or {}

    try:
        aspirantes_service.crear_o_actualizar_postulacion(f)
        return jsonify({"mensaje": "Aspirante y postulación guardados correctamente"}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@aspirantes_bp.route("/api/aspirantes/<cedula>", methods=["PUT", "OPTIONS"])
def actualizar_aspirante(cedula):
    """
    PUT /api/aspirantes/<cedula>
    Actualiza la ficha y agrega nueva postulación para aspirante reincidente.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    f = request.get_json() or {}

    try:
        aspirantes_service.actualizar_aspirante(cedula, f)
        return jsonify({"mensaje": "Aspirante actualizado correctamente"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@aspirantes_bp.route("/api/aspirantes/<cedula>/cv", methods=["POST", "OPTIONS"])
def subir_cv(cedula):
    """
    POST /api/aspirantes/<cedula>/cv
    Permite adjuntar un archivo de hoja de vida (CV) al expediente.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    archivo_cv = request.files.get("archivo")

    try:
        aspirantes_service.subir_cv(cedula, archivo_cv)
        return jsonify({"mensaje": "Documento CV subido exitosamente"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@aspirantes_bp.route("/api/uploads/<path:filename>", methods=["GET"])
@requiere_token
def descargar_archivo(filename):
    """
    GET /api/uploads/<filename>
    Descarga de archivos de currículum. Solo acceso autenticado.
    """
    return send_from_directory(UPLOAD_FOLDER, filename)


@aspirantes_bp.route("/api/verificar-cedula/<cedula>", methods=["GET", "OPTIONS"])
def verificar_cedula(cedula):
    """
    GET /api/verificar-cedula/<cedula>
    Permite al portal público verificar la existencia previa de una cédula.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    resultado = aspirantes_service.verificar_cedula(cedula)
    return jsonify(resultado), 200
