# ============================================================
# RUTAS DE DASHBOARD Y ANALÍTICA (dashboard_routes.py)
# Sistema SICS - Hotel Margarita Village
#
# Provee los endpoints de métricas de panel, analítica integral
# y generación de reportes ejecutivos en PDF.
# ============================================================

from flask import Blueprint, request, jsonify, send_file
from auth_middleware import requiere_token
from services.dashboard_service import DashboardService

dashboard_bp = Blueprint('dashboard', __name__)
dashboard_service = DashboardService()


@dashboard_bp.route("/api/dashboard/metricas", methods=["GET", "OPTIONS"])
@requiere_token
def dashboard_metricas():
    """
    GET /api/dashboard/metricas
    Calcula y devuelve los Indicadores Clave de Desempeño (KPIs) ejecutivos
    que se muestran en las tarjetas superiores del Dashboard.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    metricas = dashboard_service.get_dashboard_metrics()
    return jsonify(metricas), 200


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

    registros = dashboard_service.get_recent_activity()
    return jsonify(registros), 200


@dashboard_bp.route("/api/dashboard/analitica", methods=["GET", "OPTIONS"])
@requiere_token
def dashboard_analitica():
    """
    GET /api/dashboard/analitica?periodo=todo|30d|90d|365d
    Retorna la inteligencia de selección: embudo de conversión, distribución de cargos,
    demografía, rendimiento de pruebas y evolución de postulaciones.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    periodo = request.args.get("periodo", "todo")
    try:
        data = dashboard_service.get_analytics(periodo=periodo)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": f"Error al generar analítica: {str(e)}"}), 500


@dashboard_bp.route("/api/dashboard/reporte-pdf", methods=["GET", "OPTIONS"])
@requiere_token
def dashboard_reporte_pdf():
    """
    GET /api/dashboard/reporte-pdf?periodo=todo|30d|90d|365d
    Genera y descarga el Informe Ejecutivo de Analítica y KPIs en PDF
    con membrete formal del Hotel Margarita Village.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    periodo = request.args.get("periodo", "todo")
    try:
        pdf_buffer = dashboard_service.generar_reporte_pdf(periodo=periodo)
        filename = f"Informe_KPIs_Reclutamiento_{periodo}.pdf"
        return send_file(
            pdf_buffer,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return jsonify({"error": f"Error al generar informe PDF: {str(e)}"}), 500
