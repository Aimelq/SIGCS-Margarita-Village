from repositories.aspirantes_repository import AspirantesRepository


class AspirantesService:
    def __init__(self):
        self.repository = AspirantesRepository()

    def get_perfil(self, cedula):
        """
        Obtiene el perfil completo 360° de un aspirante incluyendo sus documentos adjuntos.
        """
        aspirante = self.repository.get_perfil_by_cedula(cedula)
        if not aspirante:
            raise ValueError("Candidato no encontrado en el sistema")

        resultado = dict(aspirante)
        documentos = self.repository.get_documentos_by_aspirante_id(aspirante["id"])
        resultado["documentos"] = list(documentos)
        return resultado

    def get_historial(self, cedula):
        """Obtiene la línea de tiempo completa de decisiones de selección de un candidato."""
        return self.repository.get_historial_by_cedula(cedula)

    def actualizar_estado(self, cedula, nuevo_estado, notas, motivo_rechazo, usuario_id):
        """
        Actualiza manualmente el estado del proceso de un candidato
        y registra la traza en la Memoria Institucional (historiales).
        """
        if not nuevo_estado:
            raise ValueError("El nuevo estado es obligatorio")

        postulacion = self.repository.get_ultima_postulacion_by_cedula(cedula)
        if not postulacion:
            raise ValueError("No se encontró postulación activa para el candidato")

        self.repository.update_estado(
            postulacion["id"], cedula, nuevo_estado,
            motivo_rechazo, notas, usuario_id
        )

    def crear_o_actualizar_postulacion(self, datos):
        """
        Registra un nuevo aspirante o actualiza uno existente desde el formulario público.
        Regla de negocio: si la cédula ya existe → UPDATE de datos + nueva postulación.
        Si no existe → INSERT de aspirante + primera postulación.
        """
        if not datos.get("cedula"):
            raise ValueError("La cédula es obligatoria")

        self.repository.crear_o_actualizar_aspirante(datos)

    def actualizar_aspirante(self, cedula, datos):
        """
        Actualiza el expediente de un aspirante existente y agrega una nueva postulación
        (flujo de candidato reincidente desde el portal público).
        """
        self.repository.actualizar_aspirante(cedula, datos)

    def subir_cv(self, cedula, archivo_cv):
        """Valida y delega el guardado del documento CV al repositorio."""
        if not archivo_cv or not archivo_cv.filename:
            raise ValueError("No se adjuntó ningún archivo")
        self.repository.subir_cv(cedula, archivo_cv)

    def verificar_cedula(self, cedula):
        """Verifica si una cédula ya está registrada en el sistema (portal público)."""
        aspirante = self.repository.verificar_cedula(cedula)
        if aspirante:
            return {"existe": True, "datos": dict(aspirante)}
        return {"existe": False}

    def generar_ficha_pdf(self, cedula):
        """
        Genera la Ficha Técnica / Solicitud de Empleo en PDF con membrete corporativo,
        incluso antes de que el candidato haya realizado entrevistas o evaluaciones.
        """
        perfil = self.get_perfil(cedula)
        evaluacion = self.repository.get_evaluacion_resumen(perfil["id"])
        examen = self.repository.get_examenes_resumen(perfil["id"])
        
        from services.pdf_service import generar_ficha_candidato_pdf
        return generar_ficha_candidato_pdf(perfil, evaluacion, examen)

