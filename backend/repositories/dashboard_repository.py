# ============================================================
# REPOSITORIO DE DASHBOARD Y ANALÍTICA (dashboard_repository.py)
# Sistema SICS - Hotel Margarita Village
#
# Ejecuta las consultas agregadas para métricas ejecutivas,
# embudo de conversión, distribución de postulantes y desempeño de pruebas.
# ============================================================

import psycopg2.extras
from db import get_db

class DashboardRepository:

    def get_metrics(self):
        """
        Retorna los KPIs principales del panel de control:
        Volumen total, postulados en la semana, en revisión, seleccionados,
        tasa de conversión global, tiempo promedio de contratación y desempeño en pruebas.
        """
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Total aspirantes
            cur.execute("SELECT COUNT(*) FROM aspirantes")
            total_aspirantes = cur.fetchone()[0]

            # Postulados últimos 7 días
            cur.execute("SELECT COUNT(*) FROM postulaciones WHERE fecha_solicitud >= CURRENT_DATE - INTERVAL '7 days'")
            postulados_semana = cur.fetchone()[0]

            # En revisión
            cur.execute("SELECT COUNT(*) FROM aspirantes WHERE estado_actual = 'En revisión'")
            en_revision = cur.fetchone()[0]

            # Seleccionados / Aptos
            cur.execute("SELECT COUNT(*) FROM aspirantes WHERE estado_actual = 'Seleccionado'")
            aptos = cur.fetchone()[0]

            # Tasa de conversión global (%)
            tasa_conversion = round((aptos / total_aspirantes * 100), 1) if total_aspirantes > 0 else 0.0

            # Tiempo promedio de resolución (días)
            cur.execute("""
                SELECT COALESCE(ROUND(AVG(h.created_at::date - p.fecha_solicitud), 1), 0)
                FROM historiales h
                JOIN postulaciones p ON p.aspirante_id = h.aspirante_id
                WHERE h.veredicto IN ('Seleccionado', 'Descartado', 'Apto', 'No Apto')
            """)
            row_tiempo = cur.fetchone()
            tiempo_promedio = float(row_tiempo[0]) if row_tiempo and row_tiempo[0] is not None else 0.0

            # Desempeño promedio en exámenes psicotécnicos
            cur.execute("""
                SELECT
                    COALESCE(ROUND(AVG(puntaje), 1), 0),
                    COUNT(CASE WHEN puntaje >= 14 THEN 1 END),
                    COUNT(CASE WHEN estado = 'Finalizado' THEN 1 END)
                FROM examenes
            """)
            row_exam = cur.fetchone()
            promedio_examen = float(row_exam[0]) if row_exam and row_exam[0] is not None else 0.0
            aprobados_exam = row_exam[1] or 0
            finalizados_exam = row_exam[2] or 0
            tasa_aprobacion_pruebas = round((aprobados_exam / finalizados_exam * 100), 1) if finalizados_exam > 0 else 0.0

            # Top cargo solicitado
            cur.execute("""
                SELECT empleo_solicitado, COUNT(*) as cnt
                FROM postulaciones
                WHERE empleo_solicitado IS NOT NULL AND TRIM(empleo_solicitado) != ''
                GROUP BY empleo_solicitado
                ORDER BY cnt DESC
                LIMIT 1
            """)
            top_cargo_row = cur.fetchone()
            top_cargo = top_cargo_row[0] if top_cargo_row else "No definido"

            # Tasa de reincidencia
            cur.execute("""
                SELECT COUNT(*) FROM (
                    SELECT aspirante_id FROM postulaciones GROUP BY aspirante_id HAVING COUNT(*) > 1
                ) sub
            """)
            reincidentes = cur.fetchone()[0]
            tasa_reincidencia = round((reincidentes / total_aspirantes * 100), 1) if total_aspirantes > 0 else 0.0

            return {
                "total_aspirantes": total_aspirantes,
                "postulados_semana": postulados_semana,
                "en_revision": en_revision,
                "aptos": aptos,
                "tasa_conversion": tasa_conversion,
                "tiempo_promedio_dias": tiempo_promedio,
                "promedio_examen": promedio_examen,
                "tasa_aprobacion_pruebas": tasa_aprobacion_pruebas,
                "top_cargo": top_cargo,
                "tasa_reincidencia": tasa_reincidencia
            }
        finally:
            conn.close()

    def get_recent_applications(self, limit=10):
        """Obtiene las postulaciones más recientes para el feed del dashboard."""
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
                ORDER BY p.fecha_solicitud DESC, p.id DESC
                LIMIT %s
            """, (limit,))
            return cur.fetchall()
        finally:
            conn.close()

    def get_analytics_data(self, dias=None):
        """
        Retorna la inteligencia de selección y analítica integral:
        Embudo de reclutamiento, distribución de cargos, datos demográficos,
        rendimiento psicotécnico y evolución temporal.
        """
        conn = get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            filtro_fecha = ""
            params = []
            if dias and dias > 0:
                filtro_fecha = "WHERE p.fecha_solicitud >= CURRENT_DATE - INTERVAL '%s days'"
                params = [dias]

            # 1. Total y Conteos para el Embudo
            cur.execute(f"""
                SELECT
                    COUNT(DISTINCT a.id) as total_postulados,
                    COUNT(DISTINCT CASE WHEN a.estado_actual IN ('En revisión', 'Citado', 'Seleccionado') THEN a.id END) as paso_revision,
                    COUNT(DISTINCT CASE WHEN a.estado_actual IN ('Citado', 'Seleccionado') THEN a.id END) as paso_citado,
                    COUNT(DISTINCT CASE WHEN a.estado_actual = 'Seleccionado' THEN a.id END) as paso_seleccionado,
                    COUNT(DISTINCT CASE WHEN a.estado_actual = 'Descartado' THEN a.id END) as descartados
                FROM aspirantes a
                JOIN postulaciones p ON p.aspirante_id = a.id
                {filtro_fecha}
            """, params)
            emb_row = cur.fetchone()
            total = emb_row["total_postulados"] or 0
            rev = emb_row["paso_revision"] or 0
            cit = emb_row["paso_citado"] or 0
            sel = emb_row["paso_seleccionado"] or 0
            desc = emb_row["descartados"] or 0

            embudo = [
                {
                    "etapa": "1. Postulación Inicial",
                    "cantidad": total,
                    "porcentaje_total": 100.0 if total > 0 else 0.0,
                    "retencion": 100.0 if total > 0 else 0.0,
                    "color": "#3b82f6"
                },
                {
                    "etapa": "2. Filtro / En Revisión",
                    "cantidad": rev,
                    "porcentaje_total": round((rev / total * 100), 1) if total > 0 else 0.0,
                    "retencion": round((rev / total * 100), 1) if total > 0 else 0.0,
                    "color": "#eab308"
                },
                {
                    "etapa": "3. Convocatoria / Citado",
                    "cantidad": cit,
                    "porcentaje_total": round((cit / total * 100), 1) if total > 0 else 0.0,
                    "retencion": round((cit / rev * 100), 1) if rev > 0 else 0.0,
                    "color": "#f97316"
                },
                {
                    "etapa": "4. Selección / Contratación",
                    "cantidad": sel,
                    "porcentaje_total": round((sel / total * 100), 1) if total > 0 else 0.0,
                    "retencion": round((sel / cit * 100), 1) if cit > 0 else 0.0,
                    "color": "#22c55e"
                }
            ]

            # 2. Distribución de Cargos más Solicitados (Top 8)
            cur.execute(f"""
                SELECT
                    COALESCE(NULLIF(TRIM(p.empleo_solicitado), ''), 'Sin especificar') as cargo,
                    COUNT(*) as total
                FROM postulaciones p
                {filtro_fecha}
                GROUP BY cargo
                ORDER BY total DESC
                LIMIT 8
            """, params)
            cargos_raw = cur.fetchall()
            distribucion_cargos = []
            for c in cargos_raw:
                porc = round((c["total"] / total * 100), 1) if total > 0 else 0.0
                distribucion_cargos.append({
                    "cargo": c["cargo"],
                    "total": c["total"],
                    "porcentaje": porc
                })

            # 3. Distribución por Nivel de Formación Académica
            cur.execute("""
                SELECT
                    COALESCE(NULLIF(TRIM(formacion), ''), 'Sin especificar') as nivel,
                    COUNT(*) as total
                FROM aspirantes
                GROUP BY nivel
                ORDER BY total DESC
                LIMIT 6
            """)
            formacion_raw = cur.fetchall()
            distribucion_formacion = [
                {
                    "nivel": f["nivel"],
                    "total": f["total"],
                    "porcentaje": round((f["total"] / total * 100), 1) if total > 0 else 0.0
                }
                for f in formacion_raw
            ]

            # 4. Disponibilidad Horaria (Turnos Rotativos y Fines de Semana)
            cur.execute(f"""
                SELECT
                    COUNT(CASE WHEN p.disponibilidad_rotativa = true THEN 1 END) as rotativo_si,
                    COUNT(CASE WHEN p.disponibilidad_fines = true THEN 1 END) as fines_si,
                    COUNT(*) as total_reg
                FROM postulaciones p
                {filtro_fecha}
            """, params)
            disp_row = cur.fetchone()
            tot_reg = disp_row["total_reg"] or 1
            disponibilidad = {
                "rotativo_porcentaje": round((disp_row["rotativo_si"] / tot_reg * 100), 1),
                "fines_porcentaje": round((disp_row["fines_si"] / tot_reg * 100), 1)
            }

            # 5. Rendimiento en Pruebas Psicotécnicas
            cur.execute("""
                SELECT
                    COUNT(*) as total_examenes,
                    COUNT(CASE WHEN estado = 'Finalizado' THEN 1 END) as finalizados,
                    COUNT(CASE WHEN estado = 'Emitido' THEN 1 END) as pendientes,
                    COUNT(CASE WHEN puntaje >= 14 THEN 1 END) as aprobados,
                    COUNT(CASE WHEN puntaje < 14 AND estado = 'Finalizado' THEN 1 END) as reprobados,
                    COALESCE(ROUND(AVG(puntaje), 1), 0) as promedio_puntos
                FROM examenes
            """)
            ex_row = cur.fetchone()
            fin_cnt = ex_row["finalizados"] or 0
            rendimiento_pruebas = {
                "total_examenes": ex_row["total_examenes"] or 0,
                "finalizados": fin_cnt,
                "pendientes": ex_row["pendientes"] or 0,
                "aprobados": ex_row["aprobados"] or 0,
                "reprobados": ex_row["reprobados"] or 0,
                "promedio_puntos": float(ex_row["promedio_puntos"]),
                "tasa_aprobacion": round((ex_row["aprobados"] / fin_cnt * 100), 1) if fin_cnt > 0 else 0.0
            }

            # 6. Evolución de Postulaciones por Mes (Últimos 6 meses)
            cur.execute("""
                SELECT
                    TO_CHAR(fecha_solicitud, 'YYYY-MM') as mes,
                    COUNT(*) as cantidad
                FROM postulaciones
                WHERE fecha_solicitud >= CURRENT_DATE - INTERVAL '6 months'
                GROUP BY mes
                ORDER BY mes ASC
            """)
            evolucion = [
                {"mes": row["mes"], "cantidad": row["cantidad"]}
                for row in cur.fetchall()
            ]

            # 7. Resumen de KPIs
            kpis = {
                "total_aspirantes": total,
                "seleccionados": sel,
                "descartados": desc,
                "tasa_conversion": round((sel / total * 100), 1) if total > 0 else 0.0,
                "promedio_examen": rendimiento_pruebas["promedio_puntos"],
                "tasa_aprobacion_pruebas": rendimiento_pruebas["tasa_aprobacion"],
                "rotativo_porcentaje": disponibilidad["rotativo_porcentaje"],
                "fines_porcentaje": disponibilidad["fines_porcentaje"]
            }

            return {
                "kpis": kpis,
                "embudo": embudo,
                "distribucion_cargos": distribucion_cargos,
                "distribucion_formacion": distribucion_formacion,
                "disponibilidad": disponibilidad,
                "rendimiento_pruebas": rendimiento_pruebas,
                "evolucion_mensual": evolucion
            }
        finally:
            conn.close()
