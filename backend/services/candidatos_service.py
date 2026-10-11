from repositories.candidatos_repository import CandidatosRepository

class CandidatosService:
    def __init__(self):
        self.repository = CandidatosRepository()

    def get_candidatos_paginated(self, q, estado, fecha_inicio, fecha_fin, formacion, page, per_page=20):
        candidatos, total = self.repository.get_all_paginated(
            q, estado, fecha_inicio, fecha_fin, formacion, page, per_page
        )
        
        return {
            "candidatos": candidatos,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": -(-total // per_page)
        }

    def search_candidatos_quick(self, q):
        if len(q) < 2:
            return []
            
        return self.repository.search_candidates(q, limit=10)
