# ============================================================
# SERVICIO DE DASHBOARD Y ANALÍTICA (dashboard_service.py)
# Sistema SICS - Hotel Margarita Village
#
# Coordina la lógica de negocio para indicadores clave (KPIs),
# reportes ejecutivos y exportación de métricas en formato PDF.
# ============================================================

from repositories.dashboard_repository import DashboardRepository

class DashboardService:
    def __init__(self):
        self.repository = DashboardRepository()

    def get_dashboard_metrics(self):
        """Retorna las métricas ejecutivas para las tarjetas superiores del dashboard."""
        return self.repository.get_metrics()

    def get_recent_activity(self):
        """Obtiene las 10 postulaciones más recientes para la tabla rápida."""
        return self.repository.get_recent_applications(limit=10)

    def get_analytics(self, periodo="todo"):
        """
        Calcula la analítica avanzada de reclutamiento según el período:
        '30d' -> Últimos 30 días
        '90d' -> Últimos 90 días
        '365d' -> Último año
        'todo' -> Todo el registro histórico
        """
        dias_map = {
            "30d": 30,
            "90d": 90,
            "365d": 365,
            "todo": None
        }
        dias = dias_map.get(periodo, None)
        return self.repository.get_analytics_data(dias=dias)

    def generar_reporte_pdf(self, periodo="todo"):
        """
        Genera el informe ejecutivo en PDF con los KPIs y gráficos de embudo y demanda.
        """
        analytics = self.get_analytics(periodo=periodo)
        from services.pdf_service import generar_reporte_metricas_pdf
        
        periodo_label = {
            "30d": "Últimos 30 días",
            "90d": "Último Trimestre (90 días)",
            "365d": "Año en Curso (365 días)",
            "todo": "Registro Histórico Completo"
        }.get(periodo, "General")

        return generar_reporte_metricas_pdf(
            kpis=analytics["kpis"],
            embudo=analytics["embudo"],
            distribucion_cargos=analytics["distribucion_cargos"],
            rendimiento_pruebas=analytics["rendimiento_pruebas"],
            periodo=periodo_label
        )
