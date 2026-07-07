import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiGrid, FiUsers, FiClipboard, FiBarChart2, FiLogOut, FiMenu, FiX, FiUser } from 'react-icons/fi';
import './DashboardLayout.css';

const DashboardLayout = () => {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  // Estado para controlar si el menú lateral (sidebar) está abierto o cerrado en móviles
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Función para cerrar sesión y redirigir
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Función para cerrar el menú en móviles cuando se hace clic en un enlace
  const cerrarMenu = () => {
    if (window.innerWidth <= 768) {
      setMenuAbierto(false);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Botón flotante para abrir el menú en móviles */}
      <button 
        className="mobile-menu-btn" 
        onClick={() => setMenuAbierto(!menuAbierto)}
        aria-label="Abrir menú"
      >
        {menuAbierto ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>

      {/* 
        SIDEBAR (Barra lateral izquierda)
        Si menuAbierto es true, se le agrega la clase 'abierto'
      */}
      <aside className={`sidebar ${menuAbierto ? 'abierto' : ''}`}>
        <div className="sidebar-header">
          <img src="/Margarita-Village-logo.png" alt="Logo" className="sidebar-logo" />
          <h3>Portal RRHH</h3>
        </div>

        <nav className="sidebar-nav">
          {/* 
            NavLink es como la etiqueta <a> pero especial de React Router.
            Automáticamente le pone la clase "active" si estamos en esa ruta.
          */}
          <NavLink to="/dashboard" end onClick={cerrarMenu} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <FiGrid className="nav-icon" />
            <span>Panel Principal</span>
          </NavLink>
          
          <NavLink to="/dashboard/candidatos" onClick={cerrarMenu} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <FiUsers className="nav-icon" />
            <span>Candidatos</span>
          </NavLink>

          <NavLink to="/dashboard/evaluaciones" onClick={cerrarMenu} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <FiClipboard className="nav-icon" />
            <span>Evaluaciones</span>
          </NavLink>

          <NavLink to="/dashboard/reportes" onClick={cerrarMenu} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <FiBarChart2 className="nav-icon" />
            <span>Reportes</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="btn-logout">
            <FiLogOut className="nav-icon" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* 
        CONTENIDO PRINCIPAL (Lado derecho)
      */}
      <main className="dashboard-main">
        {/* Cabecera superior del panel */}
        <header className="dashboard-header">
          <div className="header-title">
            {/* Aquí podríamos poner una miga de pan o el título de la página actual */}
          </div>
          <div className="header-user">
            <span className="user-name">{usuario?.nombre || 'Reclutador'}</span>
            <div className="user-avatar">
              <FiUser size={20} />
            </div>
          </div>
        </header>

        {/* 
          Área donde se inyectan las páginas hijas.
          Si la ruta es /dashboard, Outlet renderiza DashboardPage.
          Si la ruta es /dashboard/expediente/123, Outlet renderiza ExpedientePage.
        */}
        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>

      {/* Fondo oscuro cuando el menú está abierto en móviles */}
      {menuAbierto && <div className="sidebar-overlay" onClick={cerrarMenu}></div>}
    </div>
  );
};

export default DashboardLayout;
