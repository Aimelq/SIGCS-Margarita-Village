// ============================================================
// COMPONENTE DE RUTA PROTEGIDA (Guard / Protected Route)
// Sistema SICS - Hotel Margarita Village
//
// Funciona como una barrera de seguridad de navegación en el cliente.
// Verifica si existe un usuario autenticado activo en el AuthContext.
// Si el usuario no está logueado, redirige a la página de login.
// Si está autenticado, habilita el renderizado de la ruta solicitada.
// ============================================================

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RutaProtegida = () => {
  // Extrae la información del usuario desde el contexto de autenticación
  const { usuario } = useAuth();

  // Si no existe un usuario activo en el estado global:
  // Redirige hacia la ruta de inicio de sesión (/login).
  // La propiedad 'replace' sobrescribe el historial de navegación para prevenir
  // que el usuario regrese a la pantalla protegida con el botón 'Atrás' del navegador.
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  // Si la autenticación es válida:
  // El componente <Outlet /> de React Router renderiza dinámicamente
  // la ruta hija solicitada (Dashboard, Candidatos, Expediente).
  return <Outlet />;
};

export default RutaProtegida;

