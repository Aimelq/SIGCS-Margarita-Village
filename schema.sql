-- schema.sql
-- Esquema completo para el proyecto Margarita Village
-- Incluye tablas de aspirantes, postulaciones, usuarios, criterios,
-- examen, preguntas y respuestas.

-- Borrar tablas en orden inverso para evitar errores de dependencia
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

-- Tabla principal de aspirantes / candidatos
CREATE TABLE aspirantes (
  id SERIAL PRIMARY KEY,
  cedula VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  apellido VARCHAR(120) NOT NULL,
  correo VARCHAR(180),
  telefono VARCHAR(50),
  direccion VARCHAR(250),
  fecha_nacimiento DATE,
  formacion TEXT,
  experiencia TEXT,
  estado_actual VARCHAR(32) NOT NULL DEFAULT 'Postulado',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de postulaciones concretas, conectada a un aspirante
CREATE TABLE postulaciones (
  id SERIAL PRIMARY KEY,
  aspirante_id INT NOT NULL,
  fecha_solicitud DATE NOT NULL DEFAULT CURRENT_DATE,
  empleo_solicitado VARCHAR(150),
  sueldo_aspira VARCHAR(80),
  motivacion TEXT,
  habilidades TEXT,
  fortalezas TEXT,
  experiencia_ultimos_empleos TEXT,
  referencias TEXT,
  data_bancaria TEXT,
  disponibilidad_rotativa BOOLEAN,
  disponibilidad_fines BOOLEAN,
  municipio VARCHAR(150),
  estado_civil VARCHAR(80),
  carga_familiar TEXT,
  medio_transporte VARCHAR(100),
  tipo_vehiculo VARCHAR(100),
  form_data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_postulacion_aspirante_fecha UNIQUE (aspirante_id, fecha_solicitud),
  FOREIGN KEY (aspirante_id) REFERENCES aspirantes(id) ON DELETE CASCADE
);

-- Usuarios del sistema (reclutadores, administradores)
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  email VARCHAR(180) NOT NULL UNIQUE,
  nombre VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(40) NOT NULL DEFAULT 'reclutador',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Criterios de evaluación utilizados en el proceso
CREATE TABLE criterios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(180) NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(60) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Documentos asociados a un aspirante
CREATE TABLE documentos (
  id SERIAL PRIMARY KEY,
  aspirante_id INT NOT NULL,
  tipo VARCHAR(80) NOT NULL,
  nombre_original VARCHAR(255) NOT NULL,
  ruta_archivo VARCHAR(400) NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (aspirante_id) REFERENCES aspirantes(id) ON DELETE CASCADE
);

-- Historial de decisiones y seguimientos por aspirante
CREATE TABLE historiales (
  id SERIAL PRIMARY KEY,
  aspirante_id INT NOT NULL,
  fecha DATE NOT NULL,
  cargo_solicitado VARCHAR(180) NOT NULL,
  veredicto VARCHAR(32) NOT NULL,
  motivo_rechazo TEXT,
  notas TEXT,
  user_id INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (aspirante_id) REFERENCES aspirantes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Evaluaciones generales realizadas por un usuario sobre un aspirante
CREATE TABLE evaluaciones (
  id SERIAL PRIMARY KEY,
  aspirante_id INT NOT NULL,
  user_id INT NOT NULL,
  elegible_count INT NOT NULL DEFAULT 0,
  no_elegible_count INT NOT NULL DEFAULT 0,
  veredicto VARCHAR(32) NOT NULL,
  justificacion_automatizada TEXT,
  notas TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (aspirante_id) REFERENCES aspirantes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- Detalle de criterios evaluados por cada evaluación
CREATE TABLE evaluacion_criterios (
  id SERIAL PRIMARY KEY,
  evaluacion_id INT NOT NULL,
  criterio_id INT NOT NULL,
  decision VARCHAR(20) NOT NULL,
  comentario TEXT,
  FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (criterio_id) REFERENCES criterios(id) ON DELETE RESTRICT
);

-- Exámenes asignados a aspirantes
CREATE TABLE examenes (
  id SERIAL PRIMARY KEY,
  aspirante_id INT NOT NULL,
  token_unico VARCHAR(255) NOT NULL UNIQUE,
  fecha_emision TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_vencimiento TIMESTAMP NOT NULL,
  estado VARCHAR(40) NOT NULL DEFAULT 'Emitido',
  puntaje DECIMAL(5,2),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (aspirante_id) REFERENCES aspirantes(id) ON DELETE CASCADE
);

-- Banco de preguntas para los exámenes
CREATE TABLE preguntas (
  id SERIAL PRIMARY KEY,
  texto TEXT NOT NULL,
  tipo VARCHAR(40) NOT NULL,
  opciones_json TEXT,
  respuesta_correcta TEXT,
  creado_por INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Relación N:N entre exámenes y preguntas
CREATE TABLE examen_preguntas (
  id SERIAL PRIMARY KEY,
  examen_id INT NOT NULL,
  pregunta_id INT NOT NULL,
  orden INT,
  puntaje_max DECIMAL(5,2) DEFAULT 1.0,
  FOREIGN KEY (examen_id) REFERENCES examenes(id) ON DELETE CASCADE,
  FOREIGN KEY (pregunta_id) REFERENCES preguntas(id) ON DELETE RESTRICT,
  CONSTRAINT uq_examen_pregunta UNIQUE (examen_id, pregunta_id)
);

-- Respuestas registradas por cada pregunta dentro de un examen
CREATE TABLE respuestas_examen (
  id SERIAL PRIMARY KEY,
  examen_pregunta_id INT NOT NULL,
  attempt_number INT NOT NULL DEFAULT 1,
  respuesta TEXT,
  es_correcta BOOLEAN,
  puntaje DECIMAL(5,2),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (examen_pregunta_id) REFERENCES examen_preguntas(id) ON DELETE CASCADE
);

-- Índices para consultas frecuentes
CREATE INDEX idx_aspirantes_estado_actual ON aspirantes(estado_actual);
CREATE INDEX idx_evaluaciones_aspirante_id ON evaluaciones(aspirante_id);
CREATE INDEX idx_examenes_aspirante_id ON examenes(aspirante_id);
CREATE INDEX idx_historiales_aspirante_id ON historiales(aspirante_id);
CREATE INDEX idx_documentos_aspirante_id ON documentos(aspirante_id);
CREATE INDEX idx_preguntas_creado_por ON preguntas(creado_por);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para mantener el campo updated_at
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
