from flask import Blueprint, request, jsonify
import psycopg2.extras
from db import get_db
from auth_middleware import requiere_token

evaluaciones_bp = Blueprint('evaluaciones', __name__)

# ============================================================
# MOTOR DE GENERACIÓN DE LENGUAJE NATURAL (NLG)
# Diccionario de plantillas semánticas contextualizadas para
# redactar informes de evaluación en prosa técnica formal.
# ============================================================
PLANTILLAS_NLG = {
    "Imagen": {
        "positivo": "proyecta una imagen profesional acorde con los estándares de hospitalidad del hotel",
        "negativo": "no presenta el nivel de imagen profesional requerido para representar al hotel",
        "con_nota": "no cumple los estándares de imagen institucional ({nota})"
    },
    "Lexico": {
        "positivo": "demuestra un léxico formal apropiado para la atención al cliente",
        "negativo": "no emplea el vocabulario formal requerido para interactuar con huéspedes",
        "con_nota": "presenta deficiencias en el uso del léxico formal ({nota})"
    },
    "Vocablo": {
        "positivo": "posee una riqueza de vocabulario suficiente para el cargo",
        "negativo": "muestra limitaciones en el vocabulario que podrían afectar la comunicación con el huésped",
        "con_nota": "evidencia restricciones en su vocabulario ({nota})"
    },
    "Lenguaje corporal": {
        "positivo": "mantiene un lenguaje corporal apropiado y seguro durante la interacción",
        "negativo": "su comunicación no verbal no refleja la confianza y profesionalismo del cargo",
        "con_nota": "presenta dificultades en su lenguaje corporal ({nota})"
    },
    "Sentido comun": {
        "positivo": "demuestra capacidad para tomar decisiones prácticas en situaciones cotidianas",
        "negativo": "muestra dificultades para responder con criterio práctico ante situaciones del entorno laboral",
        "con_nota": "evidenció limitaciones en la toma de decisiones prácticas ({nota})"
    },
    "Nivel de raciocinio": {
        "positivo": "evidencia capacidad analítica y razonamiento lógico suficientes para el cargo",
        "negativo": "no demuestra el nivel de razonamiento lógico requerido para las exigencias del puesto",
        "con_nota": "mostró dificultades de razonamiento lógico ({nota})"
    }
}


def _generar_frase_criterio(nombre_criterio, es_negativo, comentario):
    """
    Función auxiliar del Motor NLG.
    Genera una frase descriptiva en prosa para un criterio evaluado,
    usando las plantillas semánticas del diccionario PLANTILLAS_NLG.
    """
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


def _construir_justificacion(veredicto, elegible_count, no_elegible_count,
                              criterios_positivos, criterios_negativos):
    """
    Construye el texto de justificación completo mediante el Motor NLG.
    El texto se centra en las competencias del candidato, sin mencionar el
    cargo de postulación, ya que durante la entrevista el reclutador puede
    perfilarlo para una posición diferente a la que se postuló originalmente.
    """
    if veredicto == "Apto":
        puntos_fuertes = [
            _generar_frase_criterio(cn["nombre"], False, cn["comentario"])
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
            _generar_frase_criterio(cn["nombre"], True, cn["comentario"])
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


@evaluaciones_bp.route("/api/criterios", methods=["GET", "OPTIONS"])
@requiere_token
def obtener_criterios():
    """
    GET /api/criterios

    Obtiene la lista de competencias y criterios de evaluación activos.
    Los 6 criterios estándar de la institución son:
    Imagen, Léxico, Vocablo, Lenguaje Corporal, Sentido Común, Nivel de Raciocinio.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT id, nombre, descripcion, tipo
            FROM criterios
            WHERE activo = true
            ORDER BY id ASC
        """)
        criterios = cur.fetchall()
        return jsonify(criterios), 200
    finally:
        conn.close()


@evaluaciones_bp.route("/api/evaluaciones/<cedula>", methods=["POST", "OPTIONS"])
@requiere_token
def crear_evaluacion(cedula):
    """
    POST /api/evaluaciones/<cedula>

    Endpoint del Motor de Decisión e Inteligencia de Lenguaje Natural (NLG).
    Procesa las puntuaciones de la entrevista y determina el veredicto
    mediante el algoritmo de Mayoría Simple.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    datos = request.get_json() or {}
    criterios_evaluados = datos.get("criterios", [])
    notas_generales = datos.get("notas_generales", "")

    if not criterios_evaluados:
        return jsonify({"error": "Debe evaluar al menos un criterio de la lista"}), 400

    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute("SELECT id FROM aspirantes WHERE cedula = %s", (cedula,))
        aspirante = cur.fetchone()
        if not aspirante:
            return jsonify({"error": "Aspirante no encontrado"}), 404
        aspirante_id = aspirante["id"]

        # Conteo de votos (Algoritmo de Mayoría Simple)
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

        # Enriquecimiento de nombres de criterios desde la BD
        for lista in [criterios_negativos, criterios_positivos]:
            for cn in lista:
                cur.execute("SELECT nombre FROM criterios WHERE id = %s", (cn["criterio_id"],))
                fila_c = cur.fetchone()
                cn["nombre"] = fila_c["nombre"] if fila_c else f"Criterio #{cn['criterio_id']}"

        justificacion = _construir_justificacion(
            veredicto, elegible_count, no_elegible_count,
            criterios_positivos, criterios_negativos
        )

        usuario_id = int(request.usuario.get("sub"))

        cur.execute("""
            INSERT INTO evaluaciones
                (aspirante_id, user_id, elegible_count, no_elegible_count,
                 veredicto, justificacion_automatizada, notas)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            aspirante_id, usuario_id,
            elegible_count, no_elegible_count,
            veredicto, justificacion, notas_generales
        ))
        evaluacion_id = cur.fetchone()["id"]

        for item in criterios_evaluados:
            cur.execute("""
                INSERT INTO evaluacion_criterios
                    (evaluacion_id, criterio_id, decision, comentario)
                VALUES (%s, %s, %s, %s)
            """, (
                evaluacion_id,
                item.get("criterio_id"),
                item.get("decision"),
                item.get("comentario", "")
            ))

        nuevo_estado = "Seleccionado" if veredicto == "Apto" else "Descartado"

        cur.execute("""
            SELECT p.id, a.estado_actual AS estado FROM postulaciones p JOIN aspirantes a ON a.id = p.aspirante_id
            WHERE aspirante_id = %s
            ORDER BY fecha_solicitud DESC LIMIT 1
        """, (aspirante_id,))
        postulacion = cur.fetchone()

        if postulacion:
            postulacion_id = postulacion["id"]

            cur.execute(
                "UPDATE aspirantes SET estado_actual = %s WHERE id = (SELECT aspirante_id FROM postulaciones WHERE id = %s)",
                (nuevo_estado, postulacion_id)
            )

            cur.execute("""
                INSERT INTO historiales
                    (aspirante_id, fecha, cargo_solicitado, veredicto, motivo_rechazo, notas, user_id)
                VALUES
                    (%s, CURRENT_DATE, COALESCE((SELECT empleo_solicitado FROM postulaciones WHERE id = %s), 'No especificado'), %s, %s, %s, %s)
            """, (
                aspirante_id,
                postulacion_id,
                nuevo_estado,
                justificacion if veredicto == "No Apto" else "",
                f"Evaluación de entrevista registrada. {notas_generales}",
                usuario_id
            ))

        conn.commit()

        return jsonify({
            "evaluacion_id": evaluacion_id,
            "veredicto": veredicto,
            "elegible_count": elegible_count,
            "no_elegible_count": no_elegible_count,
            "justificacion": justificacion,
            "estado_candidato": nuevo_estado
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@evaluaciones_bp.route("/api/evaluaciones/<cedula>", methods=["GET", "OPTIONS"])
@requiere_token
def obtener_evaluaciones(cedula):
    """
    GET /api/evaluaciones/<cedula>

    Obtiene el historial de evaluaciones de entrevista realizadas a un candidato,
    incluyendo el detalle de cada criterio ponderado.
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute("""
            SELECT
                e.id, e.veredicto, e.elegible_count, e.no_elegible_count,
                e.justificacion_automatizada, e.notas, e.created_at,
                u.nombre as entrevistador
            FROM evaluaciones e
            JOIN aspirantes a ON a.id = e.aspirante_id
            JOIN usuarios u ON u.id = e.user_id
            WHERE a.cedula = %s
            ORDER BY e.created_at DESC
        """, (cedula,))
        evaluaciones = cur.fetchall()

        resultado = []
        for ev in evaluaciones:
            cur.execute("""
                SELECT
                    c.nombre as criterio,
                    c.descripcion,
                    ec.decision,
                    ec.comentario
                FROM evaluacion_criterios ec
                JOIN criterios c ON c.id = ec.criterio_id
                WHERE ec.evaluacion_id = %s
                ORDER BY c.id ASC
            """, (ev["id"],))
            criterios_detalle = cur.fetchall()

            ev_dict = dict(ev)
            ev_dict["criterios"] = list(criterios_detalle)
            resultado.append(ev_dict)

        return jsonify(resultado), 200

    finally:
        conn.close()
