// ============================================================
// COMPONENTE DEL FORMULARIO DE POSTULACIÓN (FormularioPostulacion)
// Sistema SICS - Hotel Margarita Village
//
// Formulario guiado por pasos (Wizard/Stepper de 4 fases) para el
// registro o actualización de datos del aspirante:
//   Paso 1: Datos Personales, Ubicación y Contacto.
//   Paso 2: Formación Académica y Expectativa Laboral.
//   Paso 3: Perfil Profesional, Experiencia y Destrezas.
//   Paso 4: Adjunto de Currículum Vitae (PDF) y Cierre.
// ============================================================

import { useState, useRef } from 'react'
import api from '../api/axios'
import { FiCheck, FiFileText, FiUploadCloud } from 'react-icons/fi'
import './FormularioPostulacion.css'

// -------------------------------------------------------
// CONSTANTES DE OPCIONES PARA SELECTORES
// -------------------------------------------------------
const ESTADOS_VENEZUELA = [
  'Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar',
  'Carabobo', 'Cojedes', 'Delta Amacuro', 'Distrito Capital', 'Falcón',
  'Guárico', 'La Guaira (Vargas)', 'Lara', 'Mérida', 'Miranda', 'Monagas',
  'Nueva Esparta', 'Portuguesa', 'Sucre', 'Táchira', 'Trujillo',
  'Yaracuy', 'Zulia', 'Extranjero'
]

const CARGOS_RESORT = [
  'Recepción / Front Desk',
  'Atención al Huésped / Guest Service',
  'Animación / Recreación / Entretenimiento',
  'Sistemas / Tecnología (IT)',
  'Ventas / Reservas / Comercial',
  'Ama de Llaves / Camarería / Lavandería',
  'Alimentos y Bebidas (Cocina / Chef)',
  'Alimentos y Bebidas (Mesero / Barman)',
  'Mantenimiento / Servicios Generales',
  'Seguridad y Prevención',
  'Recursos Humanos / Selección',
  'Administración / Contabilidad',
  'Otro'
]

function FormularioPostulacion({ cedula, datosIniciales, esActualizacion, onExito }) {
  // Estado para controlar el número de paso activo en el wizard (1 a 4)
  const [pasoActual, setPasoActual] = useState(1)

  // Estado de carga mientras se envían las peticiones HTTP al servidor
  const [cargando, setCargando] = useState(false)

  // Estado para desplegar mensajes de error en validaciones locales o remotas
  const [errorGlobal, setErrorGlobal] = useState('')

  // Referencia física para activar el selector oculto de archivos PDF
  const fileInputRef = useRef(null)

  // Estado unificado con los campos del formulario pre-poblados si el candidato ya existe
  const [form, setForm] = useState({
    nombre: datosIniciales?.nombre || '',
    apellido: datosIniciales?.apellido || '',
    correo: datosIniciales?.correo || datosIniciales?.email || '',
    telefono: datosIniciales?.telefono || '',
    edad: datosIniciales?.edad || '',
    sexo: datosIniciales?.sexo || '',
    lugar_nacimiento: datosIniciales?.lugar_nacimiento || '',
    direccion: datosIniciales?.direccion || '',
    formacion: datosIniciales?.formacion || '',
    
    // Campos específicos del perfil de postulación
    municipio: datosIniciales?.municipio || datosIniciales?.municipio_postulacion || '',
    estado_civil: datosIniciales?.estado_civil || '',
    empleo_solicitado: datosIniciales?.empleo_solicitado || '',
    sueldo_aspira: datosIniciales?.sueldo_aspira || '',
    trabaja_actualmente: datosIniciales?.trabaja_actualmente || '',
    experiencia_ultimos_empleos: datosIniciales?.experiencia_ultimos_empleos || '',
    habilidades: datosIniciales?.habilidades || '',
    fortalezas: datosIniciales?.fortalezas || '',
    referencias: datosIniciales?.referencias || '',
    motivacion: datosIniciales?.motivacion || '',
    disponibilidad_rotativa: datosIniciales?.disponibilidad_rotativa ? 'Sí' : (datosIniciales?.disponibilidad_rotativa === false ? 'No' : ''),
    disponibilidad_fines: datosIniciales?.disponibilidad_fines ? 'Sí' : (datosIniciales?.disponibilidad_fines === false ? 'No' : ''),
    carga_familiar: datosIniciales?.carga_familiar || '',
    data_bancaria: datosIniciales?.data_bancaria || '',
    medio_transporte: datosIniciales?.medio_transporte || '',
    tipo_vehiculo: datosIniciales?.tipo_vehiculo || ''
  })

  // Archivo PDF del currículum vitae seleccionado por el usuario
  const [cvFile, setCvFile] = useState(null)

  // Control único para la actualización de cualquier campo de texto o selección
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  // Validación y avance hacia el Paso 2
  const irAlPaso2 = () => {
    if (!form.nombre || !form.apellido || !form.correo || !form.telefono || !form.edad || !form.sexo || !form.lugar_nacimiento || !form.municipio) {
      setErrorGlobal('Por favor complete los campos obligatorios del Paso 1.')
      return
    }

    const edadNum = parseInt(form.edad, 10)
    if (isNaN(edadNum) || edadNum < 18) {
      setErrorGlobal('La edad debe ser un número entero mayor o igual a 18 años.')
      return
    }

    setErrorGlobal('')
    setPasoActual(2)
  }

  // Validación y avance hacia el Paso 3
  const irAlPaso3 = () => {
    if (!form.formacion || !form.empleo_solicitado || !form.sueldo_aspira || !form.trabaja_actualmente) {
      setErrorGlobal('Por favor complete los campos obligatorios del Paso 2.')
      return
    }
    setErrorGlobal('')
    setPasoActual(3)
  }

  // Validación y avance hacia el Paso 4
  const irAlPaso4 = () => {
    if (!form.experiencia_ultimos_empleos || !form.habilidades || !form.fortalezas || !form.motivacion) {
      setErrorGlobal('Por favor complete los campos obligatorios del Paso 3.')
      return
    }
    setErrorGlobal('')
    setPasoActual(4)
  }

  // Validación del archivo PDF seleccionado en el Paso 4
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setErrorGlobal('El documento de currículum debe estar en formato PDF.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorGlobal('El archivo excede el tamaño máximo permitido (5MB).')
      return
    }

    setErrorGlobal('')
    setCvFile(file)
  }

  // Envío final del formulario y carga del documento multipart al backend
  const enviarFormulario = async () => {
    if (!form.disponibilidad_rotativa || !form.disponibilidad_fines || !form.carga_familiar || !form.data_bancaria) {
       setErrorGlobal('Por favor complete los campos obligatorios del Paso 4.')
       return
    }
    if (!cvFile && !esActualizacion) {
      setErrorGlobal('El Currículum Vitae es obligatorio para nuevos registros.')
      return
    }

    setCargando(true)
    setErrorGlobal('')

    try {
      const datosCompletos = { ...form, cedula }
      
      // Llamada REST para crear o actualizar el registro del aspirante
      if (esActualizacion) {
        await api.put(`/api/aspirantes/${cedula}`, datosCompletos)
      } else {
        await api.post('/api/aspirantes', datosCompletos)
      }

      // Si se adjunto un nuevo archivo PDF, se envía via multipart/form-data
      if (cvFile) {
        const formData = new FormData()
        formData.append('archivo', cvFile)
        await api.post(`/api/aspirantes/${cedula}/cv`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }

      onExito(form.nombre)
    } catch (err) {
      console.error(err)
      setErrorGlobal(err.response?.data?.error || 'Ocurrió un error al guardar la información.')
    } finally {
      setCargando(false)
    }
  }


  return (
    <div className="form-container fade-in-up">
      
      {/* ---- STEPPER VISUAL ---- */}
      <div className="stepper">
        <div className={`step ${pasoActual >= 1 ? 'active' : ''} ${pasoActual > 1 ? 'completed' : ''}`}>
          <div className="step-circle">{pasoActual > 1 ? <FiCheck /> : '1'}</div>
          <span className="step-label">Personales</span>
        </div>
        <div className={`step ${pasoActual >= 2 ? 'active' : ''} ${pasoActual > 2 ? 'completed' : ''}`}>
          <div className="step-circle">{pasoActual > 2 ? <FiCheck /> : '2'}</div>
          <span className="step-label">Profesional</span>
        </div>
        <div className={`step ${pasoActual >= 3 ? 'active' : ''} ${pasoActual > 3 ? 'completed' : ''}`}>
          <div className="step-circle">{pasoActual > 3 ? <FiCheck /> : '3'}</div>
          <span className="step-label">Perfil</span>
        </div>
        <div className={`step ${pasoActual === 4 ? 'active' : ''}`}>
          <div className="step-circle">4</div>
          <span className="step-label">Adjuntos</span>
        </div>
      </div>

      {errorGlobal && <div className="error-msg" style={{ marginBottom: '20px', textAlign: 'center', fontSize: '15px', color: '#dc2626' }}>{errorGlobal}</div>}

      {/* ---- PASO 1: DATOS PERSONALES ---- */}
      {pasoActual === 1 && (
        <div className="paso-content fade-in-up">
          <h3 style={{ marginBottom: '24px' }}>Datos Personales y Contacto</h3>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Cédula de Identidad *</label>
              <input className="input-field" value={cedula} disabled />
            </div>
            <div className="form-group">
              <label className="form-label">Nombres *</label>
              <input name="nombre" className="input-field" value={form.nombre} onChange={handleChange} disabled={esActualizacion} placeholder="Ej: Maria Perez" />
            </div>
            <div className="form-group">
              <label className="form-label">Apellidos *</label>
              <input name="apellido" className="input-field" value={form.apellido} onChange={handleChange} disabled={esActualizacion} placeholder="Ej: Gonzalez" />
            </div>
            <div className="form-group">
              <label className="form-label">Edad (mínimo 18 años) *</label>
              <input
                type="number"
                name="edad"
                min="18"
                max="99"
                className="input-field"
                value={form.edad}
                onChange={handleChange}
                placeholder="Ej: 25"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Sexo *</label>
              <select name="sexo" className="input-field" value={form.sexo} onChange={handleChange}>
                <option value="">Elige...</option>
                <option value="Femenino">Femenino</option>
                <option value="Masculino">Masculino</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Estado de Nacimiento *</label>
              <select name="lugar_nacimiento" className="input-field" value={form.lugar_nacimiento} onChange={handleChange}>
                <option value="">Elige...</option>
                {ESTADOS_VENEZUELA.map((st, i) => (
                  <option key={i} value={st}>{st}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Municipio donde reside *</label>
              <select name="municipio" className="input-field" value={form.municipio} onChange={handleChange}>
                <option value="">Elige...</option>
                <option value="Antolín del Campo">Antolín del Campo</option>
                <option value="Arismendi">Arismendi</option>
                <option value="Díaz">Díaz</option>
                <option value="García">García</option>
                <option value="Gómez">Gómez</option>
                <option value="Maneiro">Maneiro</option>
                <option value="Marcano">Marcano</option>
                <option value="Mariño">Mariño</option>
                <option value="Península de Macanao">Península de Macanao</option>
                <option value="Tubores">Tubores</option>
                <option value="Villalba">Villalba</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Estado Civil</label>
              <select name="estado_civil" className="input-field" value={form.estado_civil} onChange={handleChange}>
                <option value="">Elige...</option>
                <option value="Soltero(a)">Soltero(a)</option>
                <option value="Casado(a)">Casado(a)</option>
                <option value="Divorciado(a)">Divorciado(a)</option>
                <option value="Viudo(a)">Viudo(a)</option>
                <option value="Conviviente">Conviviente</option>
              </select>
            </div>
            <div className="form-group full-width">
              <label className="form-label">Dirección *</label>
              <input name="direccion" className="input-field" value={form.direccion} onChange={handleChange} placeholder="Tu respuesta" />
            </div>
            <div className="form-group">
              <label className="form-label">Número de Teléfono *</label>
              <input name="telefono" className="input-field" value={form.telefono} onChange={handleChange} placeholder="Tu respuesta" />
            </div>
            <div className="form-group">
              <label className="form-label">Correo Electrónico *</label>
              <input name="correo" type="email" className="input-field" value={form.correo} onChange={handleChange} placeholder="Tu respuesta" />
            </div>
          </div>
          
          <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
            <button className="btn-primary" onClick={irAlPaso2}>Siguiente: Profesional →</button>
          </div>
        </div>
      )}

      {/* ---- PASO 2: PERFIL PROFESIONAL ---- */}
      {pasoActual === 2 && (
        <div className="paso-content fade-in-up">
          <h3 style={{ marginBottom: '24px' }}>Perfil Profesional</h3>
          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label">Grado de Instrucción u Oficio *</label>
              <select name="formacion" className="input-field" value={form.formacion} onChange={handleChange}>
                <option value="">Elige...</option>
                <option value="Bachiller">Bachiller</option>
                <option value="TSU">TSU</option>
                <option value="Universitario (Pregrado)">Universitario (Pregrado)</option>
                <option value="Postgrado / Maestría">Postgrado / Maestría</option>
                <option value="Oficio Certificado">Oficio Certificado</option>
              </select>
            </div>
            
            <div className="form-group full-width">
              <label className="form-label">¿Trabaja Actualmente? *</label>
              <select name="trabaja_actualmente" className="input-field" value={form.trabaja_actualmente} onChange={handleChange}>
                <option value="">Elige...</option>
                <option value="Sí">Sí</option>
                <option value="No">No</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Empleo Solicitado *</label>
              <select name="empleo_solicitado" className="input-field" value={form.empleo_solicitado} onChange={handleChange}>
                <option value="">Elige...</option>
                {CARGOS_RESORT.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Sueldo al que aspira (Monto exacto en USD $) *</label>
              <input
                type="number"
                name="sueldo_aspira"
                min="0"
                step="10"
                className="input-field"
                value={form.sueldo_aspira}
                onChange={handleChange}
                placeholder="Ej: 350"
              />
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setPasoActual(1)}>← Atrás</button>
            <button className="btn-primary" onClick={irAlPaso3}>Siguiente: Experiencia →</button>
          </div>
        </div>
      )}

      {/* ---- PASO 3: EXPERIENCIA Y HABILIDADES ---- */}
      {pasoActual === 3 && (
        <div className="paso-content fade-in-up">
          <h3 style={{ marginBottom: '24px' }}>Experiencia y Fortalezas</h3>
          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label">Resuma su experiencia laboral de sus últimos 3 empleos *</label>
              <span style={{fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '8px'}}>Indicando áreas de responsabilidad, funciones, últimos salarios, tareas realizadas, fecha y motivo de egreso</span>
              <textarea name="experiencia_ultimos_empleos" className="input-field" style={{minHeight: '100px'}} value={form.experiencia_ultimos_empleos} onChange={handleChange} placeholder="Tu respuesta..."></textarea>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Detalle sus Habilidades y Aptitudes *</label>
              <span style={{fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '8px'}}>Idiomas, Conocimientos informáticos, Habilidades blandas</span>
              <textarea name="habilidades" className="input-field" value={form.habilidades} onChange={handleChange} placeholder="Tu respuesta..."></textarea>
            </div>

            <div className="form-group full-width">
              <label className="form-label">¿Cuáles consideras que son tus mayores fortalezas como trabajador? *</label>
              <textarea name="fortalezas" className="input-field" value={form.fortalezas} onChange={handleChange} placeholder="Tu respuesta..."></textarea>
            </div>

            <div className="form-group full-width">
              <label className="form-label">¿Dispones de referencias laborales? *</label>
              <span style={{fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '8px'}}>Indica nombre, apellido, No. telefónico y nexo. Si no posee, coloque NO APLICA</span>
              <textarea name="referencias" className="input-field" value={form.referencias} onChange={handleChange} placeholder="Tu respuesta..."></textarea>
            </div>

            <div className="form-group full-width">
              <label className="form-label">¿Por qué está interesado en trabajar en el Hotel Margarita Village? *</label>
              <textarea name="motivacion" className="input-field" value={form.motivacion} onChange={handleChange} placeholder="Tu respuesta..."></textarea>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setPasoActual(2)}>← Atrás</button>
            <button className="btn-primary" onClick={irAlPaso4}>Siguiente: Adjuntos →</button>
          </div>
        </div>
      )}

      {/* ---- PASO 4: ADJUNTOS Y DISPONIBILIDAD ---- */}
      {pasoActual === 4 && (
        <div className="paso-content fade-in-up">
          <h3 style={{ marginBottom: '24px' }}>Disponibilidad y Adjuntos</h3>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Disponibilidad en Horarios Rotativos *</label>
              <select name="disponibilidad_rotativa" className="input-field" value={form.disponibilidad_rotativa} onChange={handleChange}>
                <option value="">Elige...</option>
                <option value="Sí">Sí</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Disponibilidad fines de semana *</label>
              <select name="disponibilidad_fines" className="input-field" value={form.disponibilidad_fines} onChange={handleChange}>
                <option value="">Elige...</option>
                <option value="Sí">Sí</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Medio de Transporte</label>
              <select name="medio_transporte" className="input-field" value={form.medio_transporte} onChange={handleChange}>
                <option value="">Elige...</option>
                <option value="Público">Público</option>
                <option value="Vehículo propio">Vehículo propio</option>
                <option value="Caminando / Otro">Caminando / Otro</option>
              </select>
            </div>

            {form.medio_transporte === 'Vehículo propio' && (
              <div className="form-group">
                <label className="form-label">Tipo de Vehículo</label>
                <select name="tipo_vehiculo" className="input-field" value={form.tipo_vehiculo} onChange={handleChange}>
                  <option value="">Elige...</option>
                  <option value="Carro">Carro</option>
                  <option value="Moto">Moto</option>
                </select>
              </div>
            )}

            <div className="form-group full-width">
              <label className="form-label">Detalle su carga familiar *</label>
              <span style={{fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '8px'}}>(nombre, apellido, edad y parentesco), Si no posee COLOQUE NO APLICA</span>
              <textarea name="carga_familiar" className="input-field" value={form.carga_familiar} onChange={handleChange} placeholder="Tu respuesta..."></textarea>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Datos Bancarios *</label>
              <span style={{fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '8px'}}>(Número de cuenta de 20 dígitos, cédula, tipo de cuenta)</span>
              <textarea name="data_bancaria" className="input-field" value={form.data_bancaria} onChange={handleChange} placeholder="Tu respuesta..."></textarea>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Adjuntar Currículum (PDF, Máx 5MB) {!esActualizacion && '*'}</label>
              <input 
                type="file" 
                accept=".pdf" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                style={{ display: 'none' }} 
              />
              <div 
                className={`cv-upload-box ${cvFile ? 'has-file' : ''}`}
                onClick={() => fileInputRef.current.click()}
              >
                <div className="cv-icon">{cvFile ? <FiFileText /> : <FiUploadCloud />}</div>
                <div className="cv-text">
                  {cvFile ? cvFile.name : 'Haz clic para seleccionar tu PDF'}
                </div>
                {!cvFile && <div className="cv-subtext">o arrastra el archivo aquí</div>}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setPasoActual(3)} disabled={cargando}>← Atrás</button>
            <button className="btn-primary" onClick={enviarFormulario} disabled={cargando}>
              {cargando ? <><span className="spinner"></span> Procesando...</> : 'Enviar Postulación 🚀'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export default FormularioPostulacion
