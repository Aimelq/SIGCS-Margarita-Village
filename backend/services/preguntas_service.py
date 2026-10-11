import json as json_module
from repositories.preguntas_repository import PreguntasRepository


class PreguntasService:
    def __init__(self):
        self.repository = PreguntasRepository()

    def _parse_opciones(self, fila):
        """Convierte el campo opciones_json a lista Python en una fila."""
        resultado = dict(fila)
        if resultado.get('opciones_json'):
            try:
                resultado['opciones'] = json_module.loads(resultado['opciones_json'])
            except (ValueError, TypeError):
                resultado['opciones'] = []
        else:
            resultado['opciones'] = []
        return resultado

    def listar_preguntas(self, tipo_filtro=None):
        preguntas = self.repository.get_all(tipo_filtro)
        return [self._parse_opciones(p) for p in preguntas]

    def obtener_pregunta(self, pregunta_id):
        fila = self.repository.get_by_id(pregunta_id)
        if not fila:
            raise ValueError("Pregunta no encontrada.")
        return self._parse_opciones(fila)

    def crear_pregunta(self, data, usuario_id):
        texto = (data.get('texto') or '').strip()
        tipo = (data.get('tipo') or '').strip()

        if not texto:
            raise ValueError("El campo texto es obligatorio.")
        if tipo not in ('abierta', 'multiple'):
            raise ValueError("El tipo debe ser 'abierta' o 'multiple'.")

        opciones = data.get('opciones', [])
        if tipo == 'multiple' and len(opciones) < 2:
            raise ValueError("Las preguntas de tipo múltiple requieren al menos 2 opciones.")

        respuesta_correcta = (data.get('respuesta_correcta') or '').strip() or None
        opciones_json = json_module.dumps(opciones, ensure_ascii=False) if opciones else None

        nueva = self.repository.create(texto, tipo, opciones_json, respuesta_correcta, usuario_id)
        nueva['opciones'] = json_module.loads(nueva['opciones_json']) if nueva.get('opciones_json') else []
        return nueva

    def editar_pregunta(self, pregunta_id, data):
        existente = self.repository.get_by_id(pregunta_id)
        if not existente:
            raise ValueError("Pregunta no encontrada.")

        texto = (data.get('texto') or '').strip() or None
        tipo = (data.get('tipo') or '').strip() or None
        opciones = data.get('opciones')
        respuesta_correcta = data.get('respuesta_correcta')

        if tipo and tipo not in ('abierta', 'multiple'):
            raise ValueError("El tipo debe ser 'abierta' o 'multiple'.")
        if tipo == 'multiple' and opciones is not None and len(opciones) < 2:
            raise ValueError("Las preguntas de tipo múltiple requieren al menos 2 opciones.")

        opciones_json = json_module.dumps(opciones, ensure_ascii=False) if opciones is not None else None

        campos, valores = [], []
        if texto:
            campos.append("texto = %s"); valores.append(texto)
        if tipo:
            campos.append("tipo = %s"); valores.append(tipo)
        if opciones_json is not None:
            campos.append("opciones_json = %s"); valores.append(opciones_json)
        if respuesta_correcta is not None:
            campos.append("respuesta_correcta = %s"); valores.append(respuesta_correcta.strip() or None)

        if not campos:
            raise ValueError("No se enviaron campos válidos para actualizar.")

        valores.append(pregunta_id)
        actualizada = self.repository.update(pregunta_id, campos, valores)
        actualizada['opciones'] = json_module.loads(actualizada['opciones_json']) if actualizada.get('opciones_json') else []
        return actualizada

    def eliminar_pregunta(self, pregunta_id):
        existente = self.repository.get_by_id(pregunta_id)
        if not existente:
            raise ValueError("Pregunta no encontrada.")

        # Regla de negocio: no se puede eliminar si está en uso en algún examen
        if self.repository.is_in_use(pregunta_id):
            raise PermissionError("No se puede eliminar esta pregunta porque está asignada a uno o más exámenes.")

        self.repository.delete(pregunta_id)
