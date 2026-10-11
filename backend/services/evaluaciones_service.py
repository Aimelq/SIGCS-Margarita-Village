from repositories.evaluaciones_repository import EvaluacionesRepository

PLANTILLAS_NLG = {
    "Imagen": {
        "positivo": "proyecta una imagen profesional acorde con los estándares de hospitalidad del hotel",
        "negativo": "no presenta el nivel de imagen profesional requerido para representar al hotel",
        "con_nota": "no cumple los estándares de imagen institucional ({nota})"
    },
    "Léxico": {
        "positivo": "demuestra un léxico formal apropiado para la atención al cliente",
        "negativo": "no emplea el vocabulario formal requerido para interactuar con huéspedes",
        "con_nota": "presenta deficiencias en el uso del léxico formal ({nota})"
    },
    "Vocablo": {
        "positivo": "posee una riqueza de vocabulario suficiente para el cargo",
        "negativo": "muestra limitaciones en el vocabulario que podrían afectar la comunicación con el huésped",
        "con_nota": "evidencia restricciones en su vocabulario ({nota})"
    },
    "Lenguaje Corporal": {
        "positivo": "mantiene un lenguaje corporal apropiado y seguro durante la interacción",
        "negativo": "su comunicación no verbal no refleja la confianza y profesionalismo del cargo",
        "con_nota": "presenta dificultades en su lenguaje corporal ({nota})"
    },
    "Sentido Común": {
        "positivo": "demuestra capacidad para tomar decisiones prácticas en situaciones cotidianas",
        "negativo": "muestra dificultades para responder con criterio práctico ante situaciones del entorno laboral",
        "con_nota": "evidenció limitaciones en la toma de decisiones prácticas ({nota})"
    },
    "Nivel de Raciocinio": {
        "positivo": "evidencia capacidad analítica y razonamiento lógico suficientes para el cargo",
        "negativo": "no demuestra el nivel de razonamiento lógico requerido para las exigencias del puesto",
        "con_nota": "mostró dificultades de razonamiento lógico ({nota})"
    }
}

class EvaluacionesService:
    def __init__(self):
        self.repository = EvaluacionesRepository()

    def _generar_frase_criterio(self, nombre_criterio, es_negativo, comentario):
        plantilla = PLANTILLAS_NLG.get(nombre_criterio)

        if not plantilla:
            if comentario:
                return f"deficiencia en {nombre_criterio} ({comentario})"
            return f"deficiencia en {nombre_criterio}"

        if es_negativo:
            if comentario:
                return plantilla["con_nota"].format(nota=comentario)
            else:
                return plantilla["negativo"]
        else:
            return plantilla["positivo"]

    def _construir_justificacion(self, veredicto, elegible_count, no_elegible_count, criterios_positivos, criterios_negativos):
        if veredicto == "Apto":
            puntos_fuertes = [
                self._generar_frase_criterio(cn["nombre"], False, cn["comentario"])
                for cn in criterios_positivos
            ]

            if no_elegible_count == 0:
                apertura = (
                    "El candidato supera satisfactoriamente todos los criterios de selección "
                    "evaluados durante la entrevista en el Hotel Margarita Village."
                )
            else:
                apertura = (
                    f"El candidato cumple con los requisitos mínimos de selección, "
                    f"obteniendo {elegible_count} criterios elegibles "
                    f"frente a {no_elegible_count} no elegibles."
                )

            detalle = ""
            if puntos_fuertes:
                if len(puntos_fuertes) == 1:
                    detalle = f"Se destaca que {puntos_fuertes[0]}."
                else:
                    detalle = f"Entre sus fortalezas: {', '.join(puntos_fuertes[:-1])} y {puntos_fuertes[-1]}."

            advertencia = ""
            if no_elegible_count > 0:
                areas_mejora = [cn["nombre"] for cn in criterios_negativos]
                advertencia = f" Se recomienda desarrollar las áreas de: {', '.join(areas_mejora)}."

            return f"{apertura} {detalle}{advertencia}".strip()

        else:
            frases_negativas = [
                self._generar_frase_criterio(cn["nombre"], True, cn["comentario"])
                for cn in criterios_negativos
            ]

            if elegible_count == 0:
                apertura = (
                    "El candidato no cumple con ninguno de los criterios de selección "
                    "evaluados durante la entrevista en el Hotel Margarita Village."
                )
            else:
                apertura = (
                    f"El candidato no alcanza el perfil requerido en la evaluación de entrevista "
                    f"del Hotel Margarita Village, obteniendo {no_elegible_count} criterios "
                    f"no elegibles frente a {elegible_count} elegibles."
                )

            if len(frases_negativas) == 1:
                detalle = f"Se identificó que {frases_negativas[0]}."
            elif len(frases_negativas) == 2:
                detalle = f"Se identificaron deficiencias en dos áreas clave: {frases_negativas[0]}, y {frases_negativas[1]}."
            else:
                lista_str = "; ".join(frases_negativas[:-1])
                detalle = f"Se identificaron múltiples áreas de mejora: {lista_str}; y además {frases_negativas[-1]}."

            cierre = (
                " Se sugiere al aspirante trabajar en las áreas señaladas y considerar "
                "una nueva postulación en convocatorias futuras."
            )

            return f"{apertura} {detalle}{cierre}"

    def get_criterios(self):
        return self.repository.get_active_criterios()

    def procesar_evaluacion(self, cedula, usuario_id, criterios_evaluados, notas_generales):
        aspirante = self.repository.get_aspirante_by_cedula(cedula)
        if not aspirante:
            raise ValueError("Aspirante no encontrado")
        aspirante_id = aspirante["id"]

        elegible_count = 0
        no_elegible_count = 0
        criterios_negativos = []
        criterios_positivos = []

        for item in criterios_evaluados:
            decision = item.get("decision", "").lower()
            if decision == "elegible":
                elegible_count += 1
                criterios_positivos.append({
                    "criterio_id": item.get("criterio_id"),
                    "comentario": item.get("comentario", "")
                })
            elif decision == "no_elegible":
                no_elegible_count += 1
                criterios_negativos.append({
                    "criterio_id": item.get("criterio_id"),
                    "comentario": item.get("comentario", "")
                })

        veredicto = "Apto" if elegible_count > no_elegible_count else "No Apto"

        for lista in [criterios_negativos, criterios_positivos]:
            for cn in lista:
                fila_c = self.repository.get_criterio_name(cn["criterio_id"])
                cn["nombre"] = fila_c["nombre"] if fila_c else f"Criterio #{cn['criterio_id']}"

        justificacion = self._construir_justificacion(
            veredicto, elegible_count, no_elegible_count,
            criterios_positivos, criterios_negativos
        )

        nuevo_estado = "Seleccionado" if veredicto == "Apto" else "Descartado"

        evaluacion_id = self.repository.save_evaluacion(
            aspirante_id, usuario_id, elegible_count, no_elegible_count,
            veredicto, justificacion, notas_generales, criterios_evaluados, nuevo_estado
        )

        return {
            "evaluacion_id": evaluacion_id,
            "veredicto": veredicto,
            "elegible_count": elegible_count,
            "no_elegible_count": no_elegible_count,
            "justificacion": justificacion,
            "estado_candidato": nuevo_estado
        }

    def obtener_evaluaciones(self, cedula):
        return self.repository.get_evaluaciones_by_cedula(cedula)
