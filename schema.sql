-- ============================================================
-- BASE DE DATOS: SICS - Hotel Margarita Village
-- Sistema de Información para la Captación y Selección de Talento Humano
-- 
-- Este archivo define el esquema relacional completo en PostgreSQL 16.
-- Incluye la definición de tablas, relaciones por claves foráneas,
-- restricciones de integridad, índices para optimización de búsquedas
-- y funciones/triggers PL/pgSQL para actualización automática de fechas.
-- ============================================================

-- Borrado en orden inverso para respetar las dependencias de clave foránea
-- y evitar errores de integridad durante la reinicialización.
DROP TABLE IF EXISTS respuestas_examen CASCADE;
DROP TABLE IF EXISTS examen_preguntas CASCADE;
DROP TABLE IF EXISTS preguntas CASCADE;
DROP TABLE IF EXISTS examenes CASCADE;
DROP TABLE IF EXISTS evaluacion_criterios CASCADE;
DROP TABLE IF EXISTS evaluaciones CASCADE;
DROP TABLE IF EXISTS historiales CASCADE;
DROP TABLE IF EXISTS documentos CASCADE;
DROP TABLE IF EXISTS postulaciones CASCADE;
DROP TABLE IF EXISTS criterios CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS aspirantes CASCADE;

-- ------------------------------------------------------------
-- TABLA 1: aspirantes
-- Almacena la información personal básica y de contacto de las
-- personas que se postulan a cualquier vacante del hotel.
-- ------------------------------------------------------------
CREATE TABLE aspirantes (
  id SERIAL PRIMARY KEY,                          -- Identificador único autoincremental
  cedula VARCHAR(20) NOT NULL UNIQUE,             -- Número de documento de identidad (clave natural única)
  nombre VARCHAR(120) NOT NULL,                   -- Nombres del aspirante
  apellido VARCHAR(120) NOT NULL,                 -- Apellidos del aspirante
  correo VARCHAR(180),                            -- Dirección de correo electrónico de contacto
  telefono VARCHAR(50),                           -- Número de teléfono principal
  direccion VARCHAR(250),                         -- Dirección de residencia
  fecha_nacimiento DATE,                          -- Fecha de nacimiento para cálculo de edad
  formacion TEXT,                                 -- Resumen de nivel educativo y títulos obtenidos
  experiencia TEXT,                               -- Resumen general de trayectoria laboral
  estado_actual VARCHAR(32) NOT NULL DEFAULT 'Postulado', -- Estado dentro del flujo (Postulado, En revisión, Seleccionado, Descartado)
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Fecha y hora de registro inicial
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP  -- Fecha y hora de última modificación
);

-- ------------------------------------------------------------
-- TABLA 2: postulaciones
-- Contiene las solicitudes específicas realizadas por los aspirantes.
-- Un aspirante puede generar una postulación por cada proceso.
-- ------------------------------------------------------------
CREATE TABLE postulaciones (
  id SERIAL PRIMARY KEY,                          -- Identificador único de la postulación
  aspirante_id INT NOT NULL,                      -- Referencia al aspirante que realiza la solicitud
  fecha_solicitud DATE NOT NULL DEFAULT CURRENT_DATE, -- Fecha en que se registra la postulación
  empleo_solicitado VARCHAR(150),                 -- Cargo u oficio al cual aspira dentro del hotel
  sueldo_aspira VARCHAR(80),                      -- Aspiración salarial expresada por el candidato
  motivacion TEXT,                                -- Razones expresadas para querer laborar en el hotel
  habilidades TEXT,                               -- Destrezas y competencias destacadas
  fortalezas TEXT,                                -- Aspectos positivos resaltantes en el perfil
  experiencia_ultimos_empleos TEXT,               -- Detalle de los últimos cargos desempeñados
  referencias TEXT,                               -- Contactos de referencias personales o laborales
  data_bancaria TEXT,                             -- Información para eventual gestión de nómina
  disponibilidad_rotativa BOOLEAN,                -- Indicador de disponibilidad para turnos rotativos
  disponibilidad_fines BOOLEAN,                   -- Indicador de disponibilidad para fines de semana y feriados
  municipio VARCHAR(150),                         -- Municipio de residencia actual
  estado_civil VARCHAR(80),                       -- Estado civil del postulante
  carga_familiar TEXT,                            -- Información sobre personas a su cargo
  medio_transporte VARCHAR(100),                  -- Transporte utilizado para trasladarse al hotel
  tipo_vehiculo VARCHAR(100),                     -- Detalle si posee vehículo propio (carro, moto)
  form_data JSONB,                                -- Campo dinámico para almacenar datos adicionales del formulario público
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Estampa de tiempo de creación
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Estampa de tiempo de actualización
  CONSTRAINT uq_postulacion_aspirante_fecha UNIQUE (aspirante_id, fecha_solicitud), -- Evita duplicar postulaciones el mismo día
  FOREIGN KEY (aspirante_id) REFERENCES aspirantes(id) ON DELETE CASCADE            -- Si se borra el aspirante, se eliminan sus postulaciones
);

-- ------------------------------------------------------------
-- TABLA 3: usuarios
-- Almacena las cuentas del personal administrativo y reclutadores
-- autorizados para acceder al panel privado de SICS.
-- ------------------------------------------------------------
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,                          -- Identificador único del usuario
  email VARCHAR(180) NOT NULL UNIQUE,             -- Correo institucional (utilizado como nombre de usuario)
  nombre VARCHAR(150) NOT NULL,                   -- Nombre completo del reclutador o administrador
  password_hash VARCHAR(255) NOT NULL,            -- Hash seguro de la contraseña (encriptado con Bcrypt)
  rol VARCHAR(40) NOT NULL DEFAULT 'reclutador',   -- Perfil de acceso (reclutador, administrador)
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Fecha de creación de la cuenta
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP  -- Fecha de última actualización de la cuenta
);

-- ------------------------------------------------------------
-- TABLA 4: criterios
-- Catálogo de competencias evaluadas durante las entrevistas.
-- ------------------------------------------------------------
CREATE TABLE criterios (
  id SERIAL PRIMARY KEY,                          -- Identificador del criterio
  nombre VARCHAR(180) NOT NULL,                   -- Nombre del criterio (Imagen, Léxico, Vocablo, etc.)
  descripcion TEXT,                               -- Explicación del estándar que se busca medir
  tipo VARCHAR(60) NOT NULL,                      -- Categoría o clasificación de la competencia
  activo BOOLEAN NOT NULL DEFAULT TRUE,           -- Define si el criterio está habilitado en las entrevistas
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Registro de creación
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP  -- Registro de actualización
);

-- ------------------------------------------------------------
-- TABLA 5: documentos
-- Guarda las referencias de archivos subidos por o para el aspirante.
-- ------------------------------------------------------------
CREATE TABLE documentos (
  id SERIAL PRIMARY KEY,                          -- Identificador único del documento
  aspirante_id INT NOT NULL,                      -- Aspirante al que pertenece el documento
  tipo VARCHAR(80) NOT NULL,                      -- Tipo de archivo (CV, Cédula, Título, Constancia)
  nombre_original VARCHAR(255) NOT NULL,          -- Nombre original del archivo subido por el usuario
  ruta_archivo VARCHAR(400) NOT NULL,             -- Ruta física de almacenamiento en el servidor backend
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Fecha y hora de carga al sistema
  FOREIGN KEY (aspirante_id) REFERENCES aspirantes(id) ON DELETE CASCADE -- Borrado en cascada con el aspirante
);

-- ------------------------------------------------------------
-- TABLA 6: historiales
-- Almacena la Memoria Institucional. Cada cambio de estado o
-- decisión de selección deja un registro imborrable aquí.
-- ------------------------------------------------------------
CREATE TABLE historiales (
  id SERIAL PRIMARY KEY,                          -- Identificador único de la traza de historial
  aspirante_id INT NOT NULL,                      -- Aspirante al que se le registra el evento
  fecha DATE NOT NULL,                            -- Fecha del evento o decisión
  cargo_solicitado VARCHAR(180) NOT NULL,         -- Cargo que aplicaba al momento del evento
  veredicto VARCHAR(32) NOT NULL,                 -- Veredicto resultante (Apto, No Apto, Seleccionado, Descartado)
  motivo_rechazo TEXT,                            -- Justificación técnica en caso de no ser seleccionado
  notas TEXT,                                     -- Observaciones complementarias del reclutador
  user_id INT,                                    -- Usuario de RRHH que ejecutó la acción
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Estampa de tiempo del registro
  FOREIGN KEY (aspirante_id) REFERENCES aspirantes(id) ON DELETE CASCADE, -- Borrado en cascada
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE SET NULL        -- Si se borra el usuario, se conserva el historial
);

-- ------------------------------------------------------------
-- TABLA 7: evaluaciones
-- Registra las sesiones formales de entrevista presencial o remota
-- conducidas por el personal de selección.
-- ------------------------------------------------------------
CREATE TABLE evaluaciones (
  id SERIAL PRIMARY KEY,                          -- Identificador único de la entrevista
  aspirante_id INT NOT NULL,                      -- Candidato evaluado
  user_id INT NOT NULL,                           -- Reclutador que conduce la entrevista
  elegible_count INT NOT NULL DEFAULT 0,          -- Cantidad de criterios ponderados como favorables
  no_elegible_count INT NOT NULL DEFAULT 0,       -- Cantidad de criterios ponderados como desfavorables
  veredicto VARCHAR(32) NOT NULL,                 -- Resultado generado por el motor de decisión (Apto / No Apto)
  justificacion_automatizada TEXT,                -- Texto en prosa redactado por el motor NLG del backend
  notas TEXT,                                     -- Notas generales adicionales tomadas durante la sesión
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Estampa de tiempo de la evaluación
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Estampa de tiempo de modificación
  FOREIGN KEY (aspirante_id) REFERENCES aspirantes(id) ON DELETE CASCADE, -- Integridad referencial con aspirante
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE RESTRICT        -- Impide borrar usuarios que tengan evaluaciones asociadas
);

-- ------------------------------------------------------------
-- TABLA 8: evaluacion_criterios
-- Tabla de detalle N:N que especifica el voto y comentario
-- asignado a cada criterio dentro de una evaluación específica.
-- ------------------------------------------------------------
CREATE TABLE evaluacion_criterios (
  id SERIAL PRIMARY KEY,                          -- Identificador único del detalle
  evaluacion_id INT NOT NULL,                     -- Evaluación padre a la que pertenece
  criterio_id INT NOT NULL,                       -- Criterio individual evaluado
  decision VARCHAR(20) NOT NULL,                  -- Voto otorgado ('elegible' o 'no_elegible')
  comentario TEXT,                                -- Observación puntual del reclutador sobre este criterio
  FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones(id) ON DELETE CASCADE, -- Eliminación si se borra la evaluación
  FOREIGN KEY (criterio_id) REFERENCES criterios(id) ON DELETE RESTRICT     -- Protege los criterios del catálogo
);

-- ------------------------------------------------------------
-- TABLAS 9 a 12: Módulo de Exámenes y Pruebas Técnicas
-- Tablas diseñadas para la evaluación psicotécnica en línea.
-- ------------------------------------------------------------
CREATE TABLE examenes (
  id SERIAL PRIMARY KEY,                          -- Identificador del examen asignado
  aspirante_id INT NOT NULL,                      -- Aspirante que debe presentar la prueba
  token_unico VARCHAR(255) NOT NULL UNIQUE,       -- Enlace o token de acceso seguro para rendir la prueba
  fecha_emision TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Fecha en que se asignó la prueba
  fecha_vencimiento TIMESTAMP NOT NULL,           -- Límite máximo para completar la prueba
  estado VARCHAR(40) NOT NULL DEFAULT 'Emitido',  -- Estado de la prueba (Emitido, En proceso, Finalizado, Expirado)
  puntaje DECIMAL(5,2),                           -- Calificación global obtenida
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (aspirante_id) REFERENCES aspirantes(id) ON DELETE CASCADE
);

CREATE TABLE preguntas (
  id SERIAL PRIMARY KEY,                          -- Identificador único de la pregunta
  texto TEXT NOT NULL,                            -- Enunciado de la pregunta o reactivo
  tipo VARCHAR(40) NOT NULL,                      -- Tipo de reactivo (Opción múltiple, Verdadero/Falso, Abierta)
  opciones_json TEXT,                             -- Opciones de respuesta formateadas en estructura JSON
  respuesta_correcta TEXT,                        -- Clave de respuesta para calificación automática
  creado_por INT,                                 -- Reclutador que creó la pregunta
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE examen_preguntas (
  id SERIAL PRIMARY KEY,                          -- Identificador de la asignación pregunta-examen
  examen_id INT NOT NULL,                         -- Examen al que se añade la pregunta
  pregunta_id INT NOT NULL,                       -- Pregunta del banco seleccionada
  orden INT,                                      -- Secuencia en que aparece la pregunta en pantalla
  puntaje_max DECIMAL(5,2) DEFAULT 1.0,           -- Ponderación máxima asignada a esta pregunta
  FOREIGN KEY (examen_id) REFERENCES examenes(id) ON DELETE CASCADE,
  FOREIGN KEY (pregunta_id) REFERENCES preguntas(id) ON DELETE RESTRICT,
  CONSTRAINT uq_examen_pregunta UNIQUE (examen_id, pregunta_id) -- Impide duplicar la misma pregunta en un examen
);

CREATE TABLE respuestas_examen (
  id SERIAL PRIMARY KEY,                          -- Identificador de la respuesta registrada
  examen_pregunta_id INT NOT NULL,                -- Pregunta del examen a la que corresponde la respuesta
  attempt_number INT NOT NULL DEFAULT 1,          -- Número de intento realizado
  respuesta TEXT,                                 -- Opción elegida o texto ingresado por el aspirante
  es_correcta BOOLEAN,                            -- Resultado de la validación automática
  puntaje DECIMAL(5,2),                           -- Puntos otorgados en la pregunta
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (examen_pregunta_id) REFERENCES examen_preguntas(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- ÍNDICES PARA OPTIMIZACIÓN DE CONSULTAS FRECUENTES
-- Mejoran la velocidad de respuesta en filtros del Dashboard
-- y búsquedas en el panel de administración.
-- ------------------------------------------------------------
CREATE INDEX idx_aspirantes_estado_actual ON aspirantes(estado_actual);
CREATE INDEX idx_evaluaciones_aspirante_id ON evaluaciones(aspirante_id);
CREATE INDEX idx_examenes_aspirante_id ON examenes(aspirante_id);
CREATE INDEX idx_historiales_aspirante_id ON historiales(aspirante_id);
CREATE INDEX idx_documentos_aspirante_id ON documentos(aspirante_id);
CREATE INDEX idx_preguntas_creado_por ON preguntas(creado_por);

-- ------------------------------------------------------------
-- FUNCIONES Y TRIGGERS PL/pgSQL
-- Garantizan la actualización automática del campo updated_at.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Asignación de triggers a cada tabla con campo updated_at
CREATE TRIGGER trg_aspirantes_updated_at
BEFORE UPDATE ON aspirantes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_postulaciones_updated_at
BEFORE UPDATE ON postulaciones
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_usuarios_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_criterios_updated_at
BEFORE UPDATE ON criterios
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_evaluaciones_updated_at
BEFORE UPDATE ON evaluaciones
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_preguntas_updated_at
BEFORE UPDATE ON preguntas
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed para criterios de entrevista
INSERT INTO criterios (nombre, descripcion, tipo, activo) VALUES
('Imagen', 'Evaluación de la presentación personal, pulcritud y adecuación a los estándares de imagen institucional del hotel.', 'Conductual', true),
('Léxico', 'Evaluación de la fluidez del lenguaje, tono de voz y expresión verbal formal al comunicarse.', 'Comunicación', true),
('Vocablo', 'Variedad, precisión y riqueza del vocabulario profesional empleado durante la interacción.', 'Comunicación', true),
('Lenguaje Corporal', 'Postura, contacto visual, gesticulación y seguridad proyectada durante la sesión de entrevista.', 'Conductual', true),
('Sentido Común', 'Juicio práctico, prudencia y capacidad de respuesta coherente ante situaciones imprevistas.', 'Cognitivo', true),
('Nivel de Raciocinio', 'Capacidad analítica, comprensión de instrucciones complejas y lógica en resolución de problemas.', 'Cognitivo', true)
ON CONFLICT DO NOTHING;
