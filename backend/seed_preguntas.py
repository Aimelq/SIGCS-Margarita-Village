import psycopg2
import json

db_url = "postgresql://admin:admin123@db:5432/SICS-MV"

preguntas = [
    ('¿Cómo sueles reaccionar ante una queja injusta de un cliente o huésped?', 'Opción múltiple', ["Me defiendo inmediatamente", "Escucho empáticamente y busco una solución", "Ignoro la queja", "Llamo al supervisor de inmediato sin intentar resolver"], 'Escucho empáticamente y busco una solución'),
    ('¿Qué consideras más importante al trabajar en equipo?', 'Opción múltiple', ["Que mis ideas sean las únicas que se sigan", "La comunicación y el respeto mutuo", "Evitar relacionarme con mis compañeros", "Terminar mi parte rápido y no ayudar"], 'La comunicación y el respeto mutuo'),
    ('Si encuentras un objeto de valor de un huésped en el lobby, tú...', 'Opción múltiple', ["Lo dejo donde está", "Lo guardo hasta que el huésped pregunte", "Lo reporto y entrego inmediatamente a Seguridad o Recepción", "Lo guardo en mi locker personal"], 'Lo reporto y entrego inmediatamente a Seguridad o Recepción'),
    ('Prefieres trabajar en tareas repetitivas antes que enfrentarte a problemas nuevos.', 'Verdadero/Falso', ["Verdadero", "Falso"], 'Falso'),
    ('Ante una situación de alta presión y múltiples tareas, mantienes la calma.', 'Verdadero/Falso', ["Verdadero", "Falso"], 'Verdadero'),
    ('¿Cuál de las siguientes opciones describe mejor tu estilo de resolución de conflictos?', 'Opción múltiple', ["Evito el conflicto a toda costa", "Impongo mi punto de vista", "Busco un compromiso donde ambas partes ganen", "Dejo que la otra persona decida todo"], 'Busco un compromiso donde ambas partes ganen'),
    ('Es aceptable llegar 15 minutos tarde si tu turno es muy largo.', 'Verdadero/Falso', ["Verdadero", "Falso"], 'Falso'),
    ('Si notas que un compañero está cometiendo un error que afecta el servicio, tú...', 'Opción múltiple', ["No hago nada, no es mi problema", "Le llamo la atención frente a los clientes", "Hablo con él/ella en privado y ofrezco ayuda", "Me quejo directamente con el gerente"], 'Hablo con él/ella en privado y ofrezco ayuda'),
    ('Disfrutas interactuar con personas de diferentes culturas y nacionalidades.', 'Verdadero/Falso', ["Verdadero", "Falso"], 'Verdadero'),
    ('¿Qué haces si no conoces la respuesta a la pregunta de un huésped?', 'Opción múltiple', ["Invento una respuesta para salir del paso", "Le digo que no sé y me voy", "Me disculpo y busco inmediatamente a alguien que pueda ayudarle", "Le digo que pregunte en recepción"], 'Me disculpo y busco inmediatamente a alguien que pueda ayudarle'),
    ('El trabajo en la hotelería exige alta flexibilidad de horarios.', 'Verdadero/Falso', ["Verdadero", "Falso"], 'Verdadero'),
    ('Si te asignan una tarea que consideras aburrida, ¿cómo respondes?', 'Opción múltiple', ["La hago de mala gana", "La completo con la misma dedicación que cualquier otra", "La pospongo indefinidamente", "Pido que se la asignen a otro"], 'La completo con la misma dedicación que cualquier otra'),
    ('Consideras que tu atención al detalle es excelente.', 'Verdadero/Falso', ["Verdadero", "Falso"], 'Verdadero'),
    ('¿Cómo manejas el estrés cuando tienes múltiples requerimientos urgentes?', 'Opción múltiple', ["Me paralizo y no sé por dónde empezar", "Priorizo las tareas y las abordo una por una manteniendo la calma", "Delego todo a mis compañeros", "Me molesto con facilidad"], 'Priorizo las tareas y las abordo una por una manteniendo la calma'),
    ('Es importante seguir los estándares de presentación e imagen personal todos los días.', 'Verdadero/Falso', ["Verdadero", "Falso"], 'Verdadero'),
    ('Si un huésped está molesto porque su habitación no está lista a tiempo, la mejor acción es...', 'Opción múltiple', ["Decirle que es culpa de limpieza", "Ofrecerle una disculpa sincera y brindarle una bebida mientras espera", "Ignorar su molestia porque no es mi culpa", "Pedirle que vuelva más tarde"], 'Ofrecerle una disculpa sincera y brindarle una bebida mientras espera'),
    ('Te resulta fácil adaptarte a cambios repentinos en las instrucciones de trabajo.', 'Verdadero/Falso', ["Verdadero", "Falso"], 'Verdadero'),
    ('¿Qué cualidad valoras más en un líder o supervisor?', 'Opción múltiple', ["Que sea autoritario y dé órdenes estrictas", "Que no supervise mi trabajo en absoluto", "Que comunique claramente, apoye al equipo y dé buen ejemplo", "Que me asigne pocas tareas"], 'Que comunique claramente, apoye al equipo y dé buen ejemplo'),
    ('Cuando cometes un error en el trabajo, prefieres ocultarlo para evitar problemas.', 'Verdadero/Falso', ["Verdadero", "Falso"], 'Falso'),
    ('¿Cómo te mantienes motivado durante un turno con baja ocupación?', 'Opción múltiple', ["Me aburro y reviso mi teléfono", "Busco tareas proactivamente, como ordenar o revisar inventarios", "Me voy a descansar a los vestidores", "Me quejo de la falta de movimiento"], 'Busco tareas proactivamente, como ordenar o revisar inventarios'),
    
    ('Describe una situación en la que tuviste que lidiar con un cliente difícil y cómo lo resolviste.', 'Desarrollo abierto', None, None),
    ('¿Por qué te interesa trabajar específicamente en el sector hotelero y turístico?', 'Desarrollo abierto', None, None),
    ('Menciona tres de tus mayores fortalezas y cómo estas aportarían valor a nuestro equipo.', 'Desarrollo abierto', None, None),
    ('¿Cuál ha sido tu mayor logro profesional o académico hasta la fecha y qué aprendiste de ello?', 'Desarrollo abierto', None, None),
    ('Si tuvieras que implementar una idea para mejorar la experiencia del huésped en el resort, ¿cuál sería?', 'Desarrollo abierto', None, None),
    ('Describe un momento en el que trabajaste en un equipo diverso y hubo desacuerdos. ¿Cómo se llegó a un consenso?', 'Desarrollo abierto', None, None),
    ('¿Cómo equilibras tu vida personal con las exigencias de un trabajo de turnos rotativos?', 'Desarrollo abierto', None, None),
    ('Si detectas un riesgo de seguridad en las instalaciones (ej. un cable pelado o piso mojado sin señalización), ¿cuál es tu procedimiento a seguir?', 'Desarrollo abierto', None, None),
    ('Explica brevemente tu nivel de dominio en idiomas extranjeros o herramientas tecnológicas relevantes para el cargo.', 'Desarrollo abierto', None, None),
    ('¿Cuáles son tus metas profesionales a mediano plazo (3 a 5 años) y cómo encaja este puesto en ellas?', 'Desarrollo abierto', None, None)
]

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    for p in preguntas:
        opc_json = json.dumps(p[2], ensure_ascii=False) if p[2] else None
        cur.execute(
            "INSERT INTO preguntas (texto, tipo, opciones_json, respuesta_correcta) VALUES (%s, %s, %s, %s)",
            (p[0], p[1], opc_json, p[3])
        )
    conn.commit()
    print("Seed exitoso. Insertadas 30 preguntas.")
except Exception as e:
    print("Error:", e)
finally:
    if 'conn' in locals() and conn:
        conn.close()
