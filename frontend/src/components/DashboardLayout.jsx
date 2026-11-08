// ============================================================
// DISPOSICIÓN PRINCIPAL DEL PANEL (DashboardLayout)
// Sistema SICS - Hotel Margarita Village
//
// Suministra la estructura base del panel administrativo privado.
// Contiene la barra lateral de navegación (Sidebar), la cabecera superior
// (Header con breadcrumbs y perfil del reclutador) y la zona central
// receptora de vistas mediante el componente <Outlet /> de React Router.
// ============================================================

import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiGrid, FiUsers, FiLogOut, FiMenu, FiX, FiUser, FiChevronRight,
  FiClipboard, FiBarChart2, FiSettings, FiUserCheck
} from 'react-icons/fi';
import './DashboardLayout.css';

// Mapeo de rutas dinámicas hacia etiquetas amigables para la miga de pan (Breadcrumb)
const ROUTE_TITLES = {
  '/dashboard': 'Panel principal',
  '/dashboard/candidatos': 'Candidatos',
  '/dashboard/examenes': 'Banco de preguntas',
  '/dashboard/reportes': 'Reportes & Analítica',
  '/dashboard/usuarios': 'Gestión de usuarios',
  '/dashboard/configuracion': 'Configuración de cuenta',
};

const DashboardLayout = () => {
  // Extrae información del usuario autenticado y la función de cierre de sesión desde AuthContext
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Estado para controlar la visibilidad del menú lateral en dispositivos móviles
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Manejador del evento de cierre de sesión
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Cierra automáticamente la barra lateral al hacer clic en un enlace en pantallas pequeñas
  const cerrarMenu = () => {
    if (window.innerWidth <= 992) setMenuAbierto(false);
  };

  // Detección dinámica de ruta de Expediente para generar el breadcrumb detallado
  const isExpediente = location.pathname.startsWith('/dashboard/expediente/');
  const cedula = isExpediente ? location.pathname.split('/').pop() : null;

  // Genera el componente visual de la miga de pan según la ruta actual
  const getBreadcrumb = () => {
    if (isExpediente) {
      return (
        <span className="header-breadcrumb">
          Candidatos
          <FiChevronRight size={12} style={{ margin: '0 4px', opacity: 0.5 }} />
          Expediente · {cedula}
        </span>
      );
    }
    const title = ROUTE_TITLES[location.pathname] || '';
    return title ? <span className="header-breadcrumb">{title}</span> : null;
  };

  return (
    <div className="dashboard-layout">

      {/* Barra lateral de navegación principal (Sidebar) */}
      <aside className={`sidebar ${menuAbierto ? 'abierto' : ''}`}>

        {/* Encabezado del menú lateral con isotipo, acrónimo del sistema y botón de cerrar en móviles */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src="/Margarita-Village-logo.png" alt="Logo Hotel Margarita Village" className="sidebar-logo" />
            <div className="sidebar-brand-text">
              <h3>Panel RRHH</h3>
              <span className="sidebar-sub">Margarita Village</span>
            </div>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menú"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Enlaces de navegación interna */}
        <nav className="sidebar-nav">
          <span className="sidebar-section-label">Navegación</span>

          {/* Enlace al Dashboard Principal */}
          <NavLink
            to="/dashboard"
            end
            onClick={cerrarMenu}
            className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
          >
            <FiGrid className="nav-icon" size={16} />
            <span>Panel principal</span>
          </NavLink>

          {/* Enlace a la Lista Maestra de Candidatos */}
          <NavLink
            to="/dashboard/candidatos"
            onClick={cerrarMenu}
            className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
          >
            <FiUsers className="nav-icon" size={16} />
            <span>Candidatos</span>
          </NavLink>

          {/* Enlace al Banco de Preguntas Técnicas (Sprint 7) */}
          <NavLink
            to="/dashboard/examenes"
            onClick={cerrarMenu}
            className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
          >
            <FiClipboard className="nav-icon" size={16} />
            <span>Banco de preguntas</span>
          </NavLink>

          {/* Enlace a Reportes & Analítica de Talento */}
          <NavLink
            to="/dashboard/reportes"
            onClick={cerrarMenu}
            className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
          >
            <FiBarChart2 className="nav-icon" size={16} />
            <span>Reportes & Analítica</span>
          </NavLink>

          {/* Enlace a Gestión de Usuarios (Exclusivo Administradores) */}
          {usuario?.rol === 'administrador' && (
            <NavLink
              to="/dashboard/usuarios"
              onClick={cerrarMenu}
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
            >
              <FiUserCheck className="nav-icon" size={16} />
              <span>Usuarios</span>
            </NavLink>
          )}

          {/* Enlace a Configuración de Cuenta (Disponible para todos) */}
          <NavLink
            to="/dashboard/configuracion"
            onClick={cerrarMenu}
            className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
          >
            <FiSettings className="nav-icon" size={16} />
            <span>Configuración</span>
          </NavLink>
        </nav>


        {/* Pie de la barra lateral con ficha del reclutador y botón de cierre de sesión */}
        <div className="sidebar-footer">
          <div className="sidebar-user-info">
            <div className="sidebar-avatar">
              <FiUser size={14} />
            </div>
            <div className="sidebar-user-meta">
              <span className="sidebar-user-name">{usuario?.nombre || 'Usuario'}</span>
              <span className="sidebar-user-role">{usuario?.rol || 'reclutador'}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            <FiLogOut size={15} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Área principal del panel de administración */}
      <main className="dashboard-main">
        {/* Cabecera superior con botón de apertura en móviles, breadcrumb dinámico e identificador de usuario */}
        <header className="dashboard-header">
          <div className="header-left">
            <button
              className="header-menu-btn"
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
            >
              <FiMenu size={20} />
            </button>
            <div className="header-title">
              {getBreadcrumb()}
            </div>
          </div>
          <div className="header-user">
            <div className="user-meta">
              <span className="user-name">{usuario?.nombre?.split(' ')[0] || 'Usuario'}</span>
              <span className="user-role">{usuario?.rol || 'reclutador'}</span>
            </div>
            <div className="user-avatar">
              <FiUser size={16} />
            </div>
          </div>
        </header>

        {/* Zona receptora donde se renderizan las páginas hijas (DashboardPage, CandidatosPage, ExpedientePage) */}
        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>

      {/* Capa de sombra para cerrar el menú en móviles al hacer clic fuera */}
      {menuAbierto && <div className="sidebar-overlay" onClick={cerrarMenu} />}
    </div>
  );
};

export default DashboardLayout;

