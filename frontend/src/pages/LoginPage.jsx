// ============================================================
// PÁGINA DE INICIO DE SESIÓN (LoginPage.jsx)
// Sistema SICS - Hotel Margarita Village
//
// Formulario de autenticación para el personal de Selección y Reclutamiento.
// Solicita las credenciales institucionales, las valida contra la API REST
// y almacena el token JWT resultante en el AuthContext.
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
  // Estados para controlar los campos de entrada de credenciales
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  // Extrae la función de login y el estado del usuario desde el AuthContext
  const { login, usuario } = useAuth();
  
  // Hook de enrutamiento para navegación programática
  const navigate = useNavigate();

  // Efecto de comprobación: Si el usuario ya está autenticado en memoria,
  // lo redirige de inmediato al panel principal (/dashboard).
  useEffect(() => {
    if (usuario) {
      navigate('/dashboard');
    }
  }, [usuario, navigate]);

  // Manejador del envío del formulario de autenticación
  const handleSubmit = async (e) => {
    // Previene el refresco completo de la página HTML
    e.preventDefault();
    
    setError(null);
    setCargando(true);

    // Invoca la función login expuesta por el AuthContext
    const respuesta = await login(email, password);

    if (respuesta.exito) {
      // Autenticación correcta: redirige al dashboard administrativo
      navigate('/dashboard');
    } else {
      // Autenticación fallida: muestra el mensaje de error retornado por la API
      setError(respuesta.mensaje);
    }
    
    setCargando(false);
  };

  return (
    <div className="login-container">
      {/* Fondo con partículas animadas decorativas */}
      <div className="login-particles">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>

      <div className="login-card glass-panel">
        <div className="login-header">
          <img src="/Margarita-Village-logo.png" alt="Logo Hotel Margarita Village" className="login-logo" />
          <h2>Portal de Selección de Talento Humano</h2>
          <p>Ingrese sus credenciales de acceso</p>
        </div>

        {/* Mensaje de error de credenciales */}
        {error && (
          <div className="login-error">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Correo Electrónico Institucional</label>
            <input 
              type="email" 
              id="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@margaritavillage.com"
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input 
              type="password" 
              id="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingrese su contraseña"
              required 
            />
          </div>

          <button 
            type="submit" 
            className="btn-login"
            disabled={cargando}
          >
            {cargando ? 'Verificando...' : 'Ingresar al Panel'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;

