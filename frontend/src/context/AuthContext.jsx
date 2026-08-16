// ============================================================
// CONTEXTO DE AUTENTICACIÓN (AuthContext)
// Sistema SICS - Hotel Margarita Village
//
// Implementa el patrón Context Provider en React para administrar
// el estado global de la sesión del usuario (reclutador/administrador).
// Permite que cualquier componente del sistema conozca si hay una
// sesión activa y acceder a las funciones de login y logout.
// ============================================================

import { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';

// Creación del objeto Context para la autenticación
const AuthContext = createContext();

// ------------------------------------------------------------
// HOOK PERSONALIZADO: useAuth
// Facilita la lectura del contexto desde cualquier componente.
// En lugar de importar useContext(AuthContext), se utiliza useAuth().
// ------------------------------------------------------------
export const useAuth = () => {
  return useContext(AuthContext);
};

// ------------------------------------------------------------
// COMPONENTE PROVEEDOR: AuthProvider
// Envuelve el árbol de componentes principales de la aplicación.
// ------------------------------------------------------------
export const AuthProvider = ({ children }) => {
  // Estado que almacena la información del usuario autenticado ({ id, email, nombre, rol })
  const [usuario, setUsuario] = useState(null);
  
  // Estado de carga inicial mientras se verifica la validez del token guardado
  const [cargando, setCargando] = useState(true);

  // EFECTO DE INICIALIZACIÓN: Se ejecuta una única vez al montar la aplicación
  useEffect(() => {
    // Busca si existe un token en la memoria local del navegador
    const token = localStorage.getItem('sics_token') || localStorage.getItem('sigcs_token');
    
    if (token) {
      // Solicita al backend validar el token activo mediante la ruta de verificación
      api.get('/api/auth/me')
        .then(response => {
          // Token válido: se guarda la información del usuario en el estado global
          setUsuario(response.data.usuario || response.data);
        })
        .catch(error => {
          // Token expirado o alterado: se limpia el usuario en memoria
          console.error("Error durante la validación de la sesión activa:", error);
          setUsuario(null);
        })
        .finally(() => {
          // Finaliza la etapa de verificación inicial para permitir el renderizado de la UI
          setCargando(false);
        });
    } else {
      // Si no existe token almacenado, desactiva directamente el indicador de carga
      setCargando(false);
    }
  }, []);

  // ----------------------------------------------------------
  // FUNCIÓN: login(email, password)
  // Envía las credenciales al servidor para iniciar sesión.
  // ----------------------------------------------------------
  const login = async (email, password) => {
    try {
      // Petición HTTP POST al endpoint de autenticación del backend
      const response = await api.post('/api/auth/login', { email, password });
      
      // Extracción del token firmado y los datos del usuario desde la respuesta
      const { token, usuario } = response.data;
      
      // Persistencia del token y usuario en localStorage para mantener sesión al recargar
      localStorage.setItem('sics_token', token);
      localStorage.setItem('sics_usuario', JSON.stringify(usuario));
      
      // Actualiza el estado global en memoria RAM
      setUsuario(usuario);
      
      return { exito: true };
    } catch (error) {
      // Captura de mensaje de error enviado por la API o fallo de red
      const mensaje = error.response?.data?.error || "Error al iniciar sesión en el sistema";
      return { exito: false, mensaje };
    }
  };

  // ----------------------------------------------------------
  // FUNCIÓN: logout()
  // Cierra la sesión activa y limpia el almacenamiento del cliente.
  // ----------------------------------------------------------
  const logout = () => {
    // Elimina las llaves de autenticación de localStorage
    localStorage.removeItem('sics_token');
    localStorage.removeItem('sics_usuario');
    localStorage.removeItem('sigcs_token');
    localStorage.removeItem('sigcs_usuario');
    
    // Restablece el estado global a nulo
    setUsuario(null);
  };

  // Objeto con valores y funciones expuestas a través del contexto
  const value = {
    usuario,
    cargando,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Muestra la aplicación sólo cuando ha culminado la comprobación del token */}
      {!cargando && children}
    </AuthContext.Provider>
  );
};

