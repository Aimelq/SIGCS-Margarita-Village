// ============================================================
// CONFIGURACIÓN DEL CLIENTE HTTP (AXIOS)
// Sistema SICS - Hotel Margarita Village
//
// En desarrollo: usa rutas relativas, el proxy de Vite redirige /api → backend:5000
// En producción (Render): usa VITE_API_URL para apuntar al backend desplegado
// ============================================================

import axios from 'axios'

// En producción, VITE_API_URL tendrá la URL del backend en Render.
// En local, queda vacío y el proxy de Vite se encarga.
const baseURL = import.meta.env.VITE_API_URL || ''

// Creación de la instancia global de Axios
const api = axios.create({
  baseURL,
  headers: { 
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true'
  }
})

// ------------------------------------------------------------
// INTERCEPTOR DE PETICIONES (Request Interceptor)
// Se ejecuta de manera transparente antes de que cualquier
// solicitud salga desde React hacia el backend Python.
// ------------------------------------------------------------
api.interceptors.request.use(
  (config) => {
    // Recupera el token guardado en la memoria local del navegador (localStorage)
    const token = localStorage.getItem('sics_token') || localStorage.getItem('sigcs_token');
    if (token) {
      // Inyecta el token en la cabecera estándar de autorización en formato Bearer
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // Retorna cualquier error de configuración antes del envío
    return Promise.reject(error);
  }
);

// ------------------------------------------------------------
// INTERCEPTOR DE RESPUESTAS (Response Interceptor)
// Se ejecuta automáticamente al recibir la respuesta del backend.
// ------------------------------------------------------------
api.interceptors.response.use(
  (response) => response, // Si el código HTTP es 2xx, retorna la respuesta directamente
  (error) => {
    // Si la API responde con estado 401 (No Autorizado / Token Expirado)
    if (error.response && error.response.status === 401) {
      console.warn("Sesión expirada o token inválido. Redirigiendo al inicio de sesión...");
      
      // Limpia los datos de sesión almacenados en el navegador
      localStorage.removeItem('sics_token');
      localStorage.removeItem('sics_usuario');
      localStorage.removeItem('sigcs_token');
      localStorage.removeItem('sigcs_usuario');
      
      // Redirige automáticamente a la pantalla de login del panel privado
      window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);

export default api

