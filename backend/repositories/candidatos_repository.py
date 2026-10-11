import psycopg2.extras
from db import get_db

class CandidatosRepository:
    def get_all_paginated(self, q, estado, fecha_inicio, fecha_fin, formacion, page, per_page):
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
                    p.fecha_solicitud AS created_at,
                    (SELECT COUNT(*) FROM postulaciones sub_p WHERE sub_p.aspirante_id = a.id) as cantidad_postulaciones
                FROM aspirantes a
                LEFT JOIN postulaciones p ON p.aspirante_id = a.id
                {where_clause}
                ORDER BY a.id DESC, p.fecha_solicitud DESC
                LIMIT %s OFFSET %s
            """, params + [per_page, offset])
            
            candidatos = cur.fetchall()
            return list(candidatos), total
        finally:
            conn.close()

    def search_candidates(self, q, limit=10):
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
                LIMIT %s
            """, (f"%{q}%", f"%{q}%", f"%{q}%", limit))
            
            return cur.fetchall()
        finally:
            conn.close()
