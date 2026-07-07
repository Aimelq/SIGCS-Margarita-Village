import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Este es un componente de orden superior (HOC - Higher Order Component).
// Sirve como un "guardaespaldas" para las rutas privadas del panel interno.
// Si alguien intenta entrar a /dashboard sin estar logueado, lo patea hacia afuera.
const RutaProtegida = () => {
  // Extraigo al usuario del Contexto de Autenticación
  const { usuario } = useAuth();

  // Si no hay usuario logueado en memoria, lo redirijo a la página de login
  // usando el componente <Navigate /> de React Router.
  // El atributo "replace" borra el historial del navegador para que 
  // el usuario no pueda darle al botón "Atrás" y volver al dashboard.
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  // Si SÍ hay usuario, dejo que pase y renderizo lo que estaba intentando ver
  // <Outlet /> es un componente de React Router que renderiza las "rutas hijas"
  // Por ejemplo, si la ruta es /dashboard/expediente/123, Outlet renderizará ExpedientePage
  return <Outlet />;
};

export default RutaProtegida;
