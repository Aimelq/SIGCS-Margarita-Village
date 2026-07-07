import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
  // Estados para controlar los campos del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  // Extraigo la función login y el usuario actual desde el Contexto
  const { login, usuario } = useAuth();
  
  // Hook de React Router para cambiar de página mediante código
  const navigate = useNavigate();

  // useEffect: Si detecta que ya hay un usuario logueado en memoria,
  // automáticamente lo redirige al dashboard.
  // Esto evita que un reclutador ya logueado vea la pantalla de login.
  useEffect(() => {
    if (usuario) {
      navigate('/dashboard');
    }
  }, [usuario, navigate]);

  // Función que se ejecuta cuando el usuario le da "Enter" o al botón de Ingresar
  const handleSubmit = async (e) => {
    // Evito que la página se recargue (comportamiento por defecto de HTML form)
    e.preventDefault();
    
    // Limpio errores previos y activo el spinner
    setError(null);
    setCargando(true);

    // Llamo a la función del AuthContext que se conecta con el backend
    const respuesta = await login(email, password);

    // Si fue exitoso, navego al dashboard. Si no, muestro el error
    if (respuesta.exito) {
      navigate('/dashboard');
    } else {
      setError(respuesta.mensaje);
    }
    
    // Apago el spinner
    setCargando(false);
  };

  return (
    <div className="login-container">
      {/* Background Particles for a premium feel */}
      <div className="login-particles">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>

      <div className="login-card glass-panel">
        <div className="login-header">
          {/* Logo del hotel, asume que está en la carpeta public */}
          <img src="/Margarita-Village-logo.png" alt="Hotel Margarita Village" className="login-logo" />
          <h2>Portal de Recursos Humanos</h2>
          <p>Ingresa tus credenciales para acceder al sistema</p>
        </div>

        {/* Si hay error, renderiza este bloque rojo */}
        {error && (
          <div className="login-error">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
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
              placeholder="Tu contraseña secreta"
              required 
            />
          </div>

          <button 
            type="submit" 
            className="btn-login"
            disabled={cargando} // Si está cargando, deshabilito el botón
          >
            {cargando ? 'Verificando...' : 'Ingresar al Panel'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
