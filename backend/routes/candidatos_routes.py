from flask import Blueprint, request, jsonify
import psycopg2.extras
from db import get_db
from auth_middleware import requiere_token

candidatos_bp = Blueprint('candidatos', __name__)


@candidatos_bp.route("/api/candidatos/todos", methods=["GET", "OPTIONS"])
@requiere_token
def listar_todos_candidatos():
    """
    GET /api/candidatos/todos?q=<texto>&estado=<estado>&page=<n>

    Consulta el listado general de candidatos con soporte para paginación
    en el servidor y filtros múltiples combinables.

    Parámetros recibidos en la URL (Query Params):
      - q: Texto de búsqueda libre (coincidencia parcial en cédula, nombre o apellido).
      - estado: Filtro por estado del proceso.
      - fecha_inicio / fecha_fin: Rango de fechas de postulación.
      - formacion: Filtro por nivel de instrucción o titulación.
      - page: Número de página solicitada (por defecto 1, 20 registros por página).
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    q = request.args.get("q", "").strip()
    estado = request.args.get("estado", "").strip()
    fecha_inicio = request.args.get("fecha_inicio", "").strip()
    fecha_fin = request.args.get("fecha_fin", "").strip()
    formacion = request.args.get("formacion", "").strip()
    page = int(request.args.get("page", 1))
    per_page = 20
    offset = (page - 1) * per_page

    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        condiciones = []
        params = []

        if q:
            condiciones.append("(a.cedula ILIKE %s OR a.nombre ILIKE %s OR a.apellido ILIKE %s)")
            params += [f"%{q}%", f"%{q}%", f"%{q}%"]

        if estado:
            condiciones.append("a.estado_actual = %s")
            params.append(estado)

        if fecha_inicio:
            condiciones.append("p.fecha_solicitud >= %s")
            params.append(fecha_inicio)

        if fecha_fin:
            condiciones.append("p.fecha_solicitud <= %s")
            params.append(fecha_fin)

        if formacion:
            condiciones.append("a.formacion ILIKE %s")
            params.append(f"%{formacion}%")

        where_clause = "WHERE " + " AND ".join(condiciones) if condiciones else ""

        cur.execute(f"""
            SELECT COUNT(DISTINCT a.id) FROM aspirantes a
            LEFT JOIN postulaciones p ON p.aspirante_id = a.id
            {where_clause}
        """, params)
        total = cur.fetchone()["count"]

        cur.execute(f"""
            SELECT DISTINCT ON (a.id)
                a.id,
                a.cedula,
                a.nombre,
                a.apellido,
                a.estado_actual,
                a.estado_actual AS estado,
                p.empleo_solicitado,
                p.fecha_solicitud,
                p.fecha_solicitud AS created_at
            FROM aspirantes a
            LEFT JOIN postulaciones p ON p.aspirante_id = a.id
            {where_clause}
            ORDER BY a.id DESC, p.fecha_solicitud DESC
            LIMIT %s OFFSET %s
        """, params + [per_page, offset])

        candidatos = cur.fetchall()

        return jsonify({
            "candidatos": list(candidatos),
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": -(-total // per_page)
        }), 200

    finally:
        conn.close()


@candidatos_bp.route("/api/candidatos", methods=["GET", "OPTIONS"])
@requiere_token
def buscar_candidatos():
    """
    GET /api/candidatos?q=<texto>

    Endpoint para autocompletado y búsqueda en tiempo real desde la barra
    de navegación del panel privado.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    q = request.args.get("q", "").strip()

    if len(q) < 2:
        return jsonify([]), 200

    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT DISTINCT
                a.cedula,
                a.nombre,
                a.apellido,
                p.empleo_solicitado,
                a.estado_actual AS estado,
                a.estado_actual AS estado_actual
            FROM aspirantes a
            LEFT JOIN postulaciones p ON p.aspirante_id = a.id
            WHERE
                a.cedula ILIKE %s OR
                a.nombre ILIKE %s OR
                a.apellido ILIKE %s
            LIMIT 10
        """, (f"%{q}%", f"%{q}%", f"%{q}%"))

        resultados = cur.fetchall()
        return jsonify(resultados), 200

    finally:
        conn.close()
