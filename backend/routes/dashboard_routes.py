from flask import Blueprint, request, jsonify
import psycopg2.extras
from db import get_db
from auth_middleware import requiere_token

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route("/api/dashboard/metricas", methods=["GET", "OPTIONS"])
@requiere_token
def dashboard_metricas():
    """
    GET /api/dashboard/metricas

    Calcula y devuelve los 4 Indicadores Clave de Desempeño (KPIs)
    que se muestran en las tarjetas superiores del Dashboard.

    Indicadores calculados:
      1. total_aspirantes: Total general de candidatos registrados en SICS.
      2. postulados_semana: Candidatos que se postularon en los últimos 7 días.
      3. en_revision: Candidatos en estado 'En revisión' pendientes por evaluar.
      4. aptos: Candidatos marcados como 'Seleccionado' tras evaluación.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    conn = get_db()
    try:
        cur = conn.cursor()

        cur.execute("SELECT COUNT(*) FROM aspirantes")
        total_aspirantes = cur.fetchone()[0]

        cur.execute(
            "SELECT COUNT(*) FROM postulaciones WHERE fecha_solicitud >= CURRENT_DATE - INTERVAL '7 days'"
        )
        postulados_semana = cur.fetchone()[0]

        cur.execute(
            "SELECT COUNT(*) FROM aspirantes WHERE estado_actual = 'En revisión'"
        )
        en_revision = cur.fetchone()[0]

        cur.execute(
            "SELECT COUNT(*) FROM aspirantes WHERE estado_actual = 'Seleccionado'"
        )
        aptos = cur.fetchone()[0]

        return jsonify({
            "total_aspirantes": total_aspirantes,
            "postulados_semana": postulados_semana,
            "en_revision": en_revision,
            "aptos": aptos
        }), 200

    finally:
        conn.close()


@dashboard_bp.route("/api/dashboard/recientes", methods=["GET", "OPTIONS"])
@requiere_token
def dashboard_recientes():
    """
    GET /api/dashboard/recientes

    Obtiene los 10 registros de postulación más recientes para alimentar
    la tabla de actividad rápida del Dashboard.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT
                a.cedula,
                a.nombre,
                a.apellido,
                p.empleo_solicitado,
                a.estado_actual AS estado,
                a.estado_actual AS estado_actual,
                p.fecha_solicitud AS created_at
            FROM aspirantes a
            JOIN postulaciones p ON p.aspirante_id = a.id
            ORDER BY p.fecha_solicitud DESC
            LIMIT 10
        """)
        registros = cur.fetchall()
        return jsonify(registros), 200

    finally:
        conn.close()
