import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import FormularioPostulacion from '../components/FormularioPostulacion'
import './PostularPage.css'

// PostularPage maneja los 3 estados del flujo de postulacion:
// 1. "cedula"    -> El aspirante ingresa su numero de cedula
// 2. "nuevo"     -> La cedula no existe, se muestra el formulario vacio
// 3. "existente" -> La cedula existe, se muestra el formulario prellenado
// 4. "exito"     -> El formulario se envio correctamente, pantalla de confirmacion
function PostularPage() {
  const navigate = useNavigate()

  // Estado que controla cual pantalla se muestra
  const [paso, setPaso] = useState('cedula')

  // Valor del input de cedula
  const [cedula, setCedula] = useState('')

  // Datos del aspirante si ya existe en el sistema
  const [datosExistentes, setDatosExistentes] = useState(null)

  // Nombre del aspirante para mostrar en la confirmacion
  const [nombreConfirmacion, setNombreConfirmacion] = useState('')

  // Estado de carga mientras se consulta la API
  const [cargando, setCargando] = useState(false)

  // Mensaje de error si la cedula esta vacia o hay fallo de red
  const [error, setError] = useState('')

  // Funcion que consulta al backend con la cedula ingresada.
  // Segun la respuesta, decide que pantalla mostrar.
  const verificarCedula = async () => {
    const cedulaLimpia = cedula.trim()

    if (!cedulaLimpia) {
      setError('Por favor ingresa tu numero de cedula.')
      return
    }

    // Solo acepto numeros en la cedula
    if (!/^\d+$/.test(cedulaLimpia)) {
      setError('La cedula solo debe contener numeros.')
      return
    }

    setError('')
    setCargando(true)

    try {
      // Si el backend responde 200, el aspirante ya existe
      const res = await api.get(`/api/aspirantes/${cedulaLimpia}`)
      setDatosExistentes(res.data)
      setPaso('existente')
    } catch (err) {
      if (err.response?.status === 404) {
        // La cedula no esta registrada, es un registro nuevo
        setDatosExistentes(null)
        setPaso('nuevo')
      } else {
        setError('Error de conexion. Verifica que el sistema este activo e intenta de nuevo.')
      }
    } finally {
      setCargando(false)
    }
  }

  // Permite enviar el formulario con la tecla Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') verificarCedula()
  }

  // Callback que llama el formulario cuando el envio fue exitoso
  const handleExito = (nombre) => {
    setNombreConfirmacion(nombre)
    setPaso('exito')
  }

  // ---- PANTALLA DE EXITO ----
  if (paso === 'exito') {
    return (
      <div className="postular-wrapper">
        <div className="confirmacion fade-in-up">
          <div className="confirmacion-icono">✅</div>
          <h2>¡Postulacion enviada con exito!</h2>
          <div className="gold-line" style={{ margin: '16px auto' }}></div>
          <p>
            Gracias, <strong>{nombreConfirmacion}</strong>. Hemos recibido tu informacion
            correctamente y esta guardada en nuestro sistema.
          </p>
          <p style={{ marginTop: '12px' }}>
            El equipo de Recursos Humanos del Hotel Margarita Village
            se pondra en contacto contigo pronto.
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

  // ---- PANTALLA DEL FORMULARIO (NUEVO O EXISTENTE) ----
  if (paso === 'nuevo' || paso === 'existente') {
    return (
      <div className="postular-wrapper">
        {/* Header con logo */}
        <div className="postular-header">
          <img
            src="/Margarita-Village-logo.png"
            alt="Margarita Village"
            className="postular-logo"
            onClick={() => navigate('/')}
          />
        </div>

        {/* Banner de bienvenida o de nuevo registro */}
        {paso === 'existente' ? (
          <div className="banner-existente fade-in-up">
            <span className="banner-icono">👋</span>
            <div>
              <strong>Bienvenida de vuelta, {datosExistentes.nombre}!</strong>
              <p>Tu perfil ya esta en nuestro sistema. Puedes actualizar tu informacion si es necesario.</p>
            </div>
          </div>
        ) : (
          <div className="banner-nuevo fade-in-up">
            <span className="banner-icono">🎉</span>
            <div>
              <strong>Cedula verificada. ¡Completa tus datos para postularte!</strong>
              <p>Es tu primera vez en el sistema. Rellena el formulario para crear tu perfil.</p>
            </div>
          </div>
        )}

        {/* El formulario de 3 pasos */}
        <FormularioPostulacion
          cedula={cedula}
          datosIniciales={datosExistentes}
          esActualizacion={paso === 'existente'}
          onExito={handleExito}
        />
      </div>
    )
  }

  // ---- PANTALLA DE INGRESO DE CEDULA (paso inicial) ----
  return (
    <div className="postular-wrapper">
      <div className="cedula-box fade-in-up">

        {/* Logo */}
        <img
          src="/Margarita-Village-logo.png"
          alt="Margarita Village"
          className="cedula-logo"
          onClick={() => navigate('/')}
        />

        {/* Titulo */}
        <h1 className="cedula-titulo">Portal de Postulaciones</h1>
        <div className="gold-line" style={{ margin: '12px auto 24px' }}></div>
        <p className="cedula-desc">
          Ingresa tu numero de cedula para comenzar. Si ya estas registrado,
          cargaremos tu informacion automaticamente.
        </p>

        {/* Input de cedula */}
        <div className="form-group" style={{ width: '100%', maxWidth: '380px' }}>
          <label className="form-label" htmlFor="input-cedula">
            Numero de Cedula
          </label>
          <input
            id="input-cedula"
            type="text"
            className="input-field input-cedula"
            placeholder="Ej: 30729553"
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

        {/* Boton continuar */}
        <button
          className="btn-primary btn-grande"
          id="btn-continuar-cedula"
          onClick={verificarCedula}
          disabled={cargando}
        >
          {cargando
            ? <><span className="spinner"></span> Verificando...</>
            : 'Continuar →'
          }
        </button>

        {/* Enlace para volver */}
        <button
          className="btn-link"
          onClick={() => navigate('/')}
        >
          ← Volver al inicio
        </button>

      </div>
    </div>
  )
}

export default PostularPage
