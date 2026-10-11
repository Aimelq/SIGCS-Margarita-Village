from flask import Blueprint, request, jsonify
from auth_middleware import requiere_token
from services.candidatos_service import CandidatosService

candidatos_bp = Blueprint('candidatos', __name__)
candidatos_service = CandidatosService()


@candidatos_bp.route("/api/candidatos/todos", methods=["GET", "OPTIONS"])
@requiere_token
def listar_todos_candidatos():
    """
    GET /api/candidatos/todos?q=<texto>&estado=<estado>&page=<n>
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    q = request.args.get("q", "").strip()
    estado = request.args.get("estado", "").strip()
    fecha_inicio = request.args.get("fecha_inicio", "").strip()
    fecha_fin = request.args.get("fecha_fin", "").strip()
    formacion = request.args.get("formacion", "").strip()
    page = int(request.args.get("page", 1))

    resultado = candidatos_service.get_candidatos_paginated(
        q, estado, fecha_inicio, fecha_fin, formacion, page, per_page=20
    )
    
    return jsonify(resultado), 200


@candidatos_bp.route("/api/candidatos", methods=["GET", "OPTIONS"])
@requiere_token
def buscar_candidatos():
    """
    GET /api/candidatos?q=<texto>
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    q = request.args.get("q", "").strip()

    resultados = candidatos_service.search_candidatos_quick(q)
    return jsonify(resultados), 200
