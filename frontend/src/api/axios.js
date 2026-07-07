// Instancia de Axios configurada con la URL base del backend.
// La importo desde aqui en todos los componentes para no repetir
// la URL completa en cada llamada a la API.
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' }
})

// Interceptor de Peticiones (Request)
// Antes de que cualquier petición salga de React hacia el backend, 
// este código se ejecuta automáticamente.
api.interceptors.request.use(
  (config) => {
    // Busco si hay un token guardado en el navegador (localStorage)
    const token = localStorage.getItem('sigcs_token');
    if (token) {
      // Si existe, lo agrego a los headers de la petición
      // con el formato estándar "Bearer <token>"
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de Respuestas (Response)
// Cuando el backend responde, este código se ejecuta.
api.interceptors.response.use(
  (response) => response, // Si todo sale bien (status 200), devuelvo la respuesta tal cual
  (error) => {
    // Si el backend responde con un error 401 (No Autorizado)
    // significa que el token expiró o es inválido.
    if (error.response && error.response.status === 401) {
      console.warn("Sesión expirada o token inválido. Cerrando sesión...");
      // Borro el token y el usuario del navegador
      localStorage.removeItem('sigcs_token');
      localStorage.removeItem('sigcs_usuario');
      // Redirijo al usuario a la página de login
      window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);

export default api
