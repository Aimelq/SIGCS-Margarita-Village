import uuid
import json as json_module
from datetime import datetime, timedelta
from repositories.examenes_repository import ExamenesRepository

class ExamenesService:
    def __init__(self):
        self.repository = ExamenesRepository()

    def generar_examen(self, cedula):
        asp = self.repository.get_aspirante_by_cedula(cedula)
        if not asp:
            raise ValueError("Aspirante no encontrado")

        preguntas_cerradas = self.repository.get_random_preguntas_cerradas(limit=10)
        preguntas_abiertas = self.repository.get_random_preguntas_abiertas(limit=3)

        preguntas_seleccionadas = preguntas_cerradas + preguntas_abiertas

        if not preguntas_seleccionadas:
            raise ValueError("No hay preguntas en el banco")

        token = uuid.uuid4().hex
        vencimiento = datetime.now() + timedelta(days=3)

        self.repository.save_examen(asp['id'], token, vencimiento, preguntas_seleccionadas)

        return {'mensaje': 'Examen generado', 'token': token}

    def listar_examenes(self, cedula):
        asp = self.repository.get_aspirante_by_cedula(cedula)
        if not asp:
            raise ValueError("Aspirante no encontrado")

        return self.repository.get_examenes_by_aspirante(asp['id'])

    def obtener_examen_publico(self, token):
        examen = self.repository.get_examen_by_token(token)
        if not examen:
            raise ValueError("Examen no encontrado")

        if examen['estado'] != 'Emitido':
            raise ValueError(f"Examen ya fue procesado o expiró. Estado: {examen['estado']}")

        preguntas = self.repository.get_preguntas_by_examen(examen['id'])

        for p in preguntas:
            p['opciones'] = json_module.loads(p['opciones_json']) if p.get('opciones_json') else []
            del p['opciones_json']

        return {
            'candidato': f"{examen['nombre']} {examen['apellido']}",
            'preguntas': preguntas
        }

    def responder_examen(self, token, respuestas):
        examen = self.repository.get_examen_by_token(token)
        if not examen:
            raise ValueError("Examen no encontrado")
        if examen['estado'] != 'Emitido':
            raise ValueError("El examen no admite respuestas")

        puntaje_total = 0
        respuestas_procesadas = []

        for r in respuestas:
            ep_id = r.get('examen_pregunta_id')
            ans = r.get('respuesta', '')

            p_data = self.repository.get_pregunta_with_respuesta(ep_id, examen['id'])
            if not p_data:
                continue

            es_correcta = None
            pts = 0
            if p_data['respuesta_correcta']:
                es_correcta = (str(p_data['respuesta_correcta']).strip().lower() == str(ans).strip().lower())
                pts = float(p_data['puntaje_max']) if es_correcta else 0

            puntaje_total += pts

            respuestas_procesadas.append({
                'ep_id': ep_id,
                'ans': ans,
                'es_correcta': es_correcta,
                'pts': pts
            })

        self.repository.save_respuestas(examen['id'], puntaje_total, respuestas_procesadas)
        return {'mensaje': 'Examen completado exitosamente'}

    def obtener_respuestas_examen(self, examen_id):
        examen = self.repository.get_examen_details(examen_id)
        if not examen:
            raise ValueError("Examen no encontrado")

        preguntas = self.repository.get_respuestas_detalles(examen_id)

        for p in preguntas:
            p['opciones'] = json_module.loads(p['opciones_json']) if p.get('opciones_json') else []
            del p['opciones_json']

        return {
            'examen': examen,
            'preguntas': preguntas
        }
