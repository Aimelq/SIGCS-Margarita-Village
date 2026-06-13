// Instancia de Axios configurada con la URL base del backend.
// La importo desde aqui en todos los componentes para no repetir
// la URL completa en cada llamada a la API.
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' }
})

// Interceptor para adjuntar el token si existe en localStorage
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch (e) {
    // no hacer nada si el storage no está disponible
  }
  return config
})

export default api
