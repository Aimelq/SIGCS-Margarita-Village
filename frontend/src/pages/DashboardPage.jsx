// ============================================================
// PÁGINA DEL PANEL PRINCIPAL (DashboardPage.jsx)
// Sistema SICS - Hotel Margarita Village
//
// Presenta la vista de inicio del panel administrativo privado.
// Muestra los 4 indicadores clave de desempeño (KPIs) en tiempo real,
// una barra de búsqueda con autocompletado en directo y la tabla de
// postulaciones más recientes.
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUserPlus, FiUsers, FiEye, FiCheckCircle,
  FiSearch, FiArrowRight, FiLoader
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './DashboardPage.css';

const DashboardPage = () => {
  // Datos del usuario logueado e instancia del enrutador
  const { usuario } = useAuth();
  const navigate = useNavigate();

  // Estados para métricas (KPIs) y tabla de postulaciones recientes
  const [metricas, setMetricas] = useState(null);
  const [recientes, setRecientes] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Estados para el buscador maestro con temporizador de espera (Debounce)
  const [busqueda, setBusqueda] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [buscando, setBuscando] = useState(false);

  // EFECTO 1: Carga simultánea de métricas y registros recientes al montar
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [resMetricas, resRecientes] = await Promise.all([
          api.get('/api/dashboard/metricas'),
          api.get('/api/dashboard/recientes')
        ]);
        setMetricas(resMetricas.data);
        setRecientes(resRecientes.data);
      } catch (error) {
        console.error('Error durante la lectura del dashboard:', error);
      } finally {
        setCargando(false);
      }
    };
    cargarDatos();
  }, []);

  // EFECTO 2: Búsqueda dinámica con patrón Debounce de 300ms
  useEffect(() => {
    if (!busqueda.trim()) { setResultadosBusqueda([]); return; }
    const delay = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await api.get(`/api/candidatos?q=${busqueda}`);
        setResultadosBusqueda(res.data);
      } catch (e) {
        console.error('Error durante la búsqueda de candidatos:', e);
      } finally { setBuscando(false); }
    }, 300);
    return () => clearTimeout(delay);
  }, [busqueda]);

  // Retorna la clase CSS correspondiente según el estado del candidato
  const getBadgeClass = (estado) => {
    const mapa = {
      'Postulado': 'badge-blue',
      'En revisión': 'badge-yellow',
      'Citado': 'badge-orange',
      'Seleccionado': 'badge-green',
      'Descartado': 'badge-red',
    };
    return mapa[estado] || 'badge-gray';
  };

  // Formatea fechas ISO a formato legible en español venezolano
  const formatDate = (str) => {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (cargando) {
    return (
      <div className="cargando-dashboard">
        <FiLoader className="spin-anim" size={20} />
        Cargando panel principal...
      </div>
    );
  }

  // Estructura de tarjetas de indicadores clave
  const CARDS = [
    {
      icon: <FiUserPlus size={20} />,
      bg: 'bg-blue-100',
      label: 'Postulados esta semana',
      value: metricas?.postulados_semana ?? 0
    },
    {
      icon: <FiUsers size={20} />,
      bg: 'bg-orange-100',
      label: 'Total aspirantes',
      value: metricas?.total_aspirantes ?? 0
    },
    {
      icon: <FiEye size={20} />,
      bg: 'bg-yellow-100',
      label: 'En revisión',
      value: metricas?.en_revision ?? 0
    },
    {
      icon: <FiCheckCircle size={20} />,
      bg: 'bg-green-100',
      label: 'Seleccionados',
      value: metricas?.aptos ?? 0
    },
  ];

  return (
    <div className="dashboard-page">

      {/* Cabecera del panel de control */}
      <div className="dash-header-section">
        <div className="dash-welcome">
          <h1>Bienvenido/a, {usuario?.nombre?.split(' ')[0] || 'Reclutador'}</h1>
          <p>Resumen de captación de talento — Sistema SICS</p>
        </div>

        {/* Buscador maestro con autocompletado desplegable */}
        <div className="search-section">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por cédula o nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          {busqueda && (
            <div className="search-results">
              {buscando ? (
                <div className="search-item text-muted">Buscando en la base de datos...</div>
              ) : resultadosBusqueda.length > 0 ? (
                resultadosBusqueda.map((c, i) => (
                  <div
                    key={i}
                    className="search-item"
                    onClick={() => navigate(`/dashboard/expediente/${c.cedula}`)}
                  >
                    <div className="candidato-avatar-small">
                      {c.nombre?.charAt(0)}{c.apellido?.charAt(0)}
                    </div>
                    <div className="candidato-info">
                      <strong>{c.nombre} {c.apellido}</strong>
                      <span>C.I. {c.cedula}</span>
                    </div>
                    <span className={`badge ${getBadgeClass(c.estado_actual)}`}>
                      {c.estado_actual}
                    </span>
                  </div>
                ))
              ) : (
                <div className="search-item text-muted">No se encontraron candidatos</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tarjetas de indicadores clave (KPIs) */}
      <div className="metrics-grid">
        {CARDS.map((card, i) => (
          <div className="metric-card" key={i}>
            <div className={`metric-icon ${card.bg}`}>{card.icon}</div>
            <div className="metric-info">
              <h3>{card.label}</h3>
              <p className="metric-value">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla de postulaciones recientes */}
      <div className="recent-section">
        <div className="section-header">
          <h2>Postulaciones recientes</h2>
          <button
            className="btn-secondary"
            onClick={() => navigate('/dashboard/candidatos')}
          >
            Ver catálogo completo <FiArrowRight size={14} />
          </button>
        </div>

        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Cédula</th>
                <th>Aspirante</th>
                <th>Cargo solicitado</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {recientes.map((fila, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--texto-mut)' }}>
                    {fila.cedula}
                  </td>
                  <td>
                    <div className="td-candidato">
                      <div className="candidato-avatar-small">
                        {fila.nombre?.charAt(0)}{fila.apellido?.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 600 }}>{fila.nombre} {fila.apellido}</span>
                    </div>
                  </td>
                  <td className="text-muted">{fila.empleo_solicitado || '—'}</td>
                  <td>
                    <span className={`badge ${getBadgeClass(fila.estado_actual)}`}>
                      {fila.estado_actual}
                    </span>
                  </td>
                  <td className="text-muted">{formatDate(fila.created_at)}</td>
                  <td>
                    <button
                      className="btn-action"
                      onClick={() => navigate(`/dashboard/expediente/${fila.cedula}`)}
                    >
                      Ver expediente <FiArrowRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
              {recientes.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted" style={{ padding: '2.5rem' }}>
                    No existen postulaciones recientes registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

