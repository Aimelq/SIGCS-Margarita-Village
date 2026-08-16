// ============================================================
// PÁGINA CONTENEDORA DE POSTULACIÓN (PostularPage.jsx)
// Sistema SICS - Hotel Margarita Village
//
// Administra el flujo de 4 fases del portal de postulaciones:
//   1. 'cedula':    Ingreso inicial y verificación de cédula de identidad.
//   2. 'nuevo':     Registro inicial (la cédula no posee expediente previo).
//   3. 'existente': Actualización de perfil (cédula previamente registrada).
//   4. 'exito':     Pantalla de confirmación y recepción de la postulación.
// ============================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiCheckCircle } from 'react-icons/fi'
import api from '../api/axios'
import FormularioPostulacion from '../components/FormularioPostulacion'
import './PostularPage.css'

function PostularPage() {
  const navigate = useNavigate()

  // Estado principal que define cuál paso o pantalla se renderiza ('cedula', 'nuevo', 'existente', 'exito')
  const [paso, setPaso] = useState('cedula')

  // Valor ingresado en el campo de cédula de identidad
  const [cedula, setCedula] = useState('')

  // Datos recuperados del servidor si el candidato ya existe en la base de datos
  const [datosExistentes, setDatosExistentes] = useState(null)

  // Nombre del aspirante para personalizar la pantalla final de éxito
  const [nombreConfirmacion, setNombreConfirmacion] = useState('')

  // Estado de carga durante las peticiones asíncronas HTTP
  const [cargando, setCargando] = useState(false)

  // Mensaje de error para validaciones locales o fallos del servidor
  const [error, setError] = useState('')

  // ----------------------------------------------------------
  // FUNCIÓN: verificarCedula()
  // Consulta la existencia previa del candidato en la BD por su cédula.
  // ----------------------------------------------------------
  const verificarCedula = async () => {
    const cedulaLimpia = cedula.trim()

    if (!cedulaLimpia) {
      setError('Por favor ingrese su número de cédula.')
      return
    }

    // Validación mediante expresión regular (sólo dígitos numéricos)
    if (!/^\d+$/.test(cedulaLimpia)) {
      setError('El número de cédula sólo debe contener caracteres numéricos.')
      return
    }

    setError('')
    setCargando(true)

    try {
      // Si responde HTTP 200, el candidato ya posee registro previo
      const res = await api.get(`/api/aspirantes/${cedulaLimpia}`)
      setDatosExistentes(res.data)
      setPaso('existente')
    } catch (err) {
      if (err.response?.status === 404) {
        // HTTP 404: La cédula no está registrada, se trata de una postulación nueva
        setDatosExistentes(null)
        setPaso('nuevo')
      } else {
        setError('Error de conexión con el servidor. Por favor intente más tarde.')
      }
    } finally {
      setCargando(false)
    }
  }

  // Permite enviar la verificación de cédula al presionar la tecla Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') verificarCedula()
  }

  // Callback ejecutado por el componente FormularioPostulacion al guardar con éxito
  const handleExito = (nombre) => {
    setNombreConfirmacion(nombre)
    setPaso('exito')
  }

  // ----------------------------------------------------------
  // FASE 4: PANTALLA DE CONFIRMACIÓN Y ÉXITO
  // ----------------------------------------------------------
  if (paso === 'exito') {
    return (
      <div className="postular-wrapper">
        <div className="confirmacion fade-in-up">
          <div className="confirmacion-icono" style={{ display: 'flex', justifyContent: 'center' }}>
            <FiCheckCircle size={80} style={{ color: '#10b981', filter: 'drop-shadow(0px 4px 6px rgba(16, 185, 129, 0.3))' }} />
          </div>
          <h2>¡Postulación enviada con éxito!</h2>
          <div className="gold-line" style={{ margin: '16px auto' }}></div>
          <p>
            Gracias, <strong>{nombreConfirmacion}</strong>. Hemos recibido su información
            correctamente y ha sido registrada en el sistema SICS.
          </p>
          <p style={{ marginTop: '12px' }}>
            El departamento de Talento Humano del Hotel Margarita Village
            revisará su expediente y se pondrá en contacto a la brevedad.
          </p>
          <button
            className="btn-primary"
            id="btn-volver-inicio"
            onClick={() => navigate('/')}
            style={{ marginTop: '32px' }}
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  // ----------------------------------------------------------
  // FASE 2 Y 3: FORMULARIO DINÁMICO (NUEVO REGISTRO O ACTUALIZACIÓN)
  // ----------------------------------------------------------
  if (paso === 'nuevo' || paso === 'existente') {
    return (
      <div className="postular-wrapper">
        {/* Cabecera del formulario con isotipo del hotel */}
        <div className="postular-header">
          <img
            src="/Margarita-Village-logo.png"
            alt="Logo Hotel Margarita Village"
            className="postular-logo"
            onClick={() => navigate('/')}
          />
        </div>

        {/* Mensaje informativo del estado del candidato */}
        {paso === 'existente' ? (
          <div className="banner-existente fade-in-up">
            <span className="banner-icono">[Aspirante Registrado]</span>
            <div>
              <strong>Bienvenido/a de vuelta, {datosExistentes.nombre}</strong>
              <p>Su perfil se encuentra registrado en el sistema. Puede actualizar su información y postularse al cargo deseado.</p>
            </div>
          </div>
        ) : (
          <div className="banner-nuevo fade-in-up">
            <span className="banner-icono">[Nuevo Registro]</span>
            <div>
              <strong>Cédula verificada. ¡Complete sus datos para postularse!</strong>
              <p>Es su primera postulación en el sistema. Por favor complete el formulario a continuación.</p>
            </div>
          </div>
        )}

        {/* Componente del formulario dinámico multipart */}
        <FormularioPostulacion
          cedula={cedula}
          datosIniciales={datosExistentes}
          esActualizacion={paso === 'existente'}
          onExito={handleExito}
        />
      </div>
    )
  }

  // ----------------------------------------------------------
  // FASE 1: PANTALLA INICIAL DE VERIFICACIÓN DE CÉDULA
  // ----------------------------------------------------------
  return (
    <div className="postular-wrapper">
      <div className="cedula-box fade-in-up">

        <img
          src="/Margarita-Village-logo.png"
          alt="Logo Hotel Margarita Village"
          className="cedula-logo"
          onClick={() => navigate('/')}
        />

        <h1 className="cedula-titulo">Portal de Postulaciones</h1>
        <div className="gold-line" style={{ margin: '12px auto 24px' }}></div>
        <p className="cedula-desc">
          Ingrese su número de cédula de identidad para comenzar. Si ya se encuentra registrado/a,
          cargaremos sus datos automáticamente.
        </p>

        {/* Campo de entrada para el número de cédula */}
        <div className="form-group" style={{ width: '100%', maxWidth: '380px' }}>
          <label className="form-label" htmlFor="input-cedula">
            Número de Cédula
          </label>
          <input
            id="input-cedula"
            type="text"
            className="input-field input-cedula"
            placeholder="Ej: 12345678"
            value={cedula}
            onChange={(e) => {
              setCedula(e.target.value)
              setError('')
            }}
            onKeyDown={handleKeyDown}
            maxLength={10}
            autoFocus
          />
          {error && <p className="error-msg">{error}</p>}
        </div>

        {/* Botón de verificación */}
        <button
          className="btn-primary btn-grande"
          id="btn-continuar-cedula"
          onClick={verificarCedula}
          disabled={cargando}
        >
          {cargando
            ? <><span className="spinner"></span> Verificando...</>
            : 'Continuar'
          }
        </button>

        {/* Enlace de navegación hacia el inicio */}
        <button
          className="btn-link"
          onClick={() => navigate('/')}
        >
          Volver al inicio
        </button>

      </div>
    </div>
  )
}

export default PostularPage

