import { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';

// Creo el Contexto de Autenticación. Un Contexto en React es como una 
// variable global a la que todos los componentes pueden acceder sin 
// tener que pasarlo como "props" de padre a hijo.
const AuthContext = createContext();

// Hook personalizado para usar este contexto fácilmente en otros archivos.
// En vez de escribir useContext(AuthContext), solo escriben useAuth()
export const useAuth = () => {
  return useContext(AuthContext);
};

// Componente Proveedor que envuelve a toda la aplicación
export const AuthProvider = ({ children }) => {
  // Estado para guardar la información del usuario logueado
  const [usuario, setUsuario] = useState(null);
  
  // Estado para saber si la aplicación todavía está comprobando
  // el token (para mostrar un spinner en pantalla)
  const [cargando, setCargando] = useState(true);

  // useEffect se ejecuta una sola vez cuando la aplicación se carga por primera vez
  useEffect(() => {
    // Reviso si hay un token guardado de una sesión anterior
    const token = localStorage.getItem('sigcs_token');
    
    if (token) {
      // Si hay token, consulto al backend para ver si sigue siendo válido
      api.get('/api/auth/me')
        .then(response => {
          // Si el backend dice que es válido, guardo los datos del usuario
          setUsuario(response.data);
        })
        .catch(error => {
          // Si el token expiró o es inválido, el backend manda error 401
          // y el axios interceptor ya se encarga de borrar el localStorage.
          // Aquí solo me aseguro de que el usuario en memoria sea null
          console.error("Error validando la sesión:", error);
          setUsuario(null);
        })
        .finally(() => {
          // Ya terminé de comprobar, así que apago el estado de "cargando"
          setCargando(false);
        });
    } else {
      // Si no había token, directamente apago el estado de cargando
      setCargando(false);
    }
  }, []);

  // Función para iniciar sesión (se llama desde LoginPage)
  const login = async (email, password) => {
    try {
      // Hago la petición POST al backend con email y contraseña
      const response = await api.post('/api/auth/login', { email, password });
      
      // El backend me responde con el token y los datos del usuario
      const { token, usuario } = response.data;
      
      // Guardo el token en el navegador (localStorage) para que persista
      // si el usuario recarga la página
      localStorage.setItem('sigcs_token', token);
      localStorage.setItem('sigcs_usuario', JSON.stringify(usuario));
      
      // Guardo el usuario en el estado de React (memoria RAM)
      setUsuario(usuario);
      
      return { exito: true };
    } catch (error) {
      // Si las credenciales son incorrectas, capturo el error
      const mensaje = error.response?.data?.error || "Error al iniciar sesión";
      return { exito: false, mensaje };
    }
  };

  // Función para cerrar sesión (se llama desde el botón Salir)
  const logout = () => {
    // Borro todo del navegador
    localStorage.removeItem('sigcs_token');
    localStorage.removeItem('sigcs_usuario');
    // Borro el estado en React
    setUsuario(null);
  };

  // Esto es lo que va a estar disponible para el resto de la aplicación
  const value = {
    usuario,
    cargando,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {/* 
        Renderizo a los "hijos". Por ejemplo, en App.jsx los hijos son 
        las Rutas de React Router. Si está cargando no muestro la app 
        todavía para evitar pantallas parpadeantes.
      */}
      {!cargando && children}
    </AuthContext.Provider>
  );
};
