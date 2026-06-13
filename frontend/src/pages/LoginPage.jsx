import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import './LoginPage.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const res = await api.post('/api/auth/login', { email, password })
      const { token, usuario } = res.data
      localStorage.setItem('token', token)
      localStorage.setItem('usuario', JSON.stringify(usuario))
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión')
    }
  }

  return (
    <div className="login-root">
      <div className="login-card">
        <div className="login-card-side">
          <div className="login-side-badge">Acceso administrativo</div>
          <h1>Bienvenido a <span>Margarita Village</span></h1>
          <p>
            Gestiona postulaciones, revisa candidatos y accede al panel con seguridad.
            Un panel elegante, confiable y con la identidad visual del portal.
          </p>

          <div className="login-side-stats">
            <div>
              <strong>8h</strong>
              <span>Sesión segura</span>
            </div>
            <div>
              <strong>100%</strong>
              <span>Flujo transparente</span>
            </div>
          </div>

          <div className="login-side-floating">
            <span>Panel premium</span>
            <small>Accede rápido a datos, postulantes y reportes.</small>
          </div>
        </div>

        <form className="login-card-form" onSubmit={handleSubmit}>
          <div className="form-header">
            <img src="/Margarita-Village-logo.png" alt="Margarita Village" className="login-logo" />
            <div>
              <h2>Iniciar sesión</h2>
              <p>Ingresa tu correo y contraseña para continuar.</p>
            </div>
          </div>

          {error && <div className="login-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Correo electrónico</label>
            <input
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="ejemplo@hotel.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn-primary login-submit">
            Acceder al dashboard
          </button>
        </form>
      </div>
    </div>
  )
}
