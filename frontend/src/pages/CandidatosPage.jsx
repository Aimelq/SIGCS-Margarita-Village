// ============================================================
// PÁGINA DE LISTADO MAESTRO DE CANDIDATOS (CandidatosPage.jsx)
// Sistema SICS - Hotel Margarita Village
//
// Módulo de consulta general del catálogo de postulantes.
// Incluye barra de filtros múltiples (búsqueda por texto, estado del proceso,
// nivel de instrucción y rango de fechas) y paginación en el servidor.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiSearch, FiUser, FiFilter, FiChevronLeft, FiChevronRight,
  FiBookOpen, FiCalendar, FiX, FiArrowRight, FiDownload, FiLoader
} from 'react-icons/fi';
import api from '../api/axios';
import './CandidatosPage.css';

// Lista de estados posibles dentro del flujo de selección del hotel
const ESTADOS = ['', 'Postulado', 'En revisión', 'Citado', 'Seleccionado', 'Descartado'];

// Mapeo dinámico de clases CSS para badges de estado
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

const CandidatosPage = () => {
  const navigate = useNavigate();

  // Estados de lista de candidatos y métricas de paginación
  const [candidatos, setCandidatos] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [descargandoCedula, setDescargandoCedula] = useState(null);

  // Estados para los campos de entrada de filtros
  const [q, setQ] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [formacionFiltro, setFormacionFiltro] = useState('');

  // Valores de búsqueda diferidos (Debounced) para evitar exceso de peticiones
  const [qDebounced, setQDebounced] = useState('');
  const [formacionDebounced, setFormacionDebounced] = useState('');

  // Temporizador Debounce (350ms) para la barra de búsqueda general
  useEffect(() => {
    const timer = setTimeout(() => {
      setQDebounced(q);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [q]);

  // Temporizador Debounce (350ms) para el filtro de formación académica
  useEffect(() => {
    const timer = setTimeout(() => {
      setFormacionDebounced(formacionFiltro);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [formacionFiltro]);

  // Consulta paginada a la API REST del backend
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams({ page });
      if (qDebounced) params.append('q', qDebounced);
      if (estadoFiltro) params.append('estado', estadoFiltro);
      if (fechaInicio) params.append('fecha_inicio', fechaInicio);
      if (fechaFin) params.append('fecha_fin', fechaFin);
      if (formacionDebounced) params.append('formacion', formacionDebounced);

      const res = await api.get(`/api/candidatos/todos?${params.toString()}`);
      setCandidatos(res.data.candidatos);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch (err) {
      console.error('Error al cargar la lista de candidatos:', err);
    } finally {
      setCargando(false);
    }
  }, [page, qDebounced, estadoFiltro, fechaInicio, fechaFin, formacionDebounced]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Manejadores de cambios en selectores de estado y rangos de fecha
  const handleEstado = (e) => {
    setEstadoFiltro(e.target.value);
    setPage(1);
  };

  const handleFechaInicio = (e) => {
    setFechaInicio(e.target.value);
    setPage(1);
  };

  const handleFechaFin = (e) => {
    setFechaFin(e.target.value);
    setPage(1);
  };

  // Restablece todos los filtros de búsqueda a su estado inicial
  const limpiarFiltros = () => {
    setQ('');
    setEstadoFiltro('');
    setFechaInicio('');
    setFechaFin('');
    setFormacionFiltro('');
    setPage(1);
  };

  // Descarga inmediata de Ficha Técnica / Solicitud en PDF desde el catálogo maestro
  const handleDescargarFicha = async (cedula, nombre, apellido) => {
    setDescargandoCedula(cedula);
    try {
      const response = await api.get(`/api/aspirantes/${cedula}/ficha-pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Ficha_Candidato_${nombre || ''}_${apellido || ''}_${cedula}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('No se pudo generar la ficha técnica en PDF.');
      console.error(err);
    } finally {
      setDescargandoCedula(null);
    }
  };

  return (
    <div className="candidatos-page">

      {/* Cabecera de título y totalizador de postulantes */}
      <div className="cand-header">
        <div>
          <h1 className="cand-titulo">Catálogo General de Candidatos</h1>
          <p className="cand-subtitulo">{total} aspirante{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''} en el sistema</p>
        </div>
      </div>

      {/* Barra de filtros dinámicos combinables */}
      <div className="cand-filtros">
        {/* Buscador General por Cédula, Nombre o Apellido */}
        <div className="cand-search-box">
          <FiSearch className="cand-search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre o cédula..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button className="cand-clear-btn" onClick={() => setQ('')} title="Limpiar búsqueda">
              <FiX size={12} />
            </button>
          )}
        </div>

        {/* Filtro por Estatus del Proceso */}
        <div className="cand-filter-box">
          <FiFilter className="cand-filter-icon" />
          <select value={estadoFiltro} onChange={handleEstado}>
            <option value="">Todos los estados</option>
            {ESTADOS.filter(Boolean).map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>

        {/* Filtro por Nivel Educativo / Formación */}
        <div className="cand-filter-box">
          <FiBookOpen className="cand-filter-icon" />
          <input
            type="text"
            placeholder="Formación (TSU, Lic...)"
            value={formacionFiltro}
            onChange={(e) => setFormacionFiltro(e.target.value)}
            className="cand-inline-input"
          />
          {formacionFiltro && (
            <button className="cand-clear-btn" onClick={() => setFormacionFiltro('')} title="Limpiar">
              <FiX size={12} />
            </button>
          )}
        </div>

        {/* Rango de Fechas de Solicitud */}
        <div className="cand-date-group">
          <div className="cand-date-box">
            <FiCalendar className="cand-date-icon" />
            <span className="cand-date-label">Desde:</span>
            <input
              type="date"
              value={fechaInicio}
              onChange={handleFechaInicio}
            />
          </div>
          <div className="cand-date-box">
            <FiCalendar className="cand-date-icon" />
            <span className="cand-date-label">Hasta:</span>
            <input
              type="date"
              value={fechaFin}
              onChange={handleFechaFin}
            />
          </div>
        </div>

        {/* Botón de restablecimiento de filtros */}
        {(q || estadoFiltro || formacionFiltro || fechaInicio || fechaFin) && (
          <button className="cand-reset-btn" onClick={limpiarFiltros}>
            Limpiar Filtros
          </button>
        )}
      </div>

      {/* Tabla de resultados paginados */}
      <div className="cand-table-wrap">
        {cargando ? (
          <div className="cand-loading">
            <div className="eval-spinner" />
            <p>Cargando lista de candidatos...</p>
          </div>
        ) : candidatos.length === 0 ? (
          <div className="cand-empty">
            <FiUser size={48} style={{ opacity: 0.2 }} />
            <p>No se encontraron candidatos que coincidan con los filtros seleccionados.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Cédula</th>
                <th>Nombre Completo</th>
                <th>Cargo Solicitado</th>
                <th>Estado</th>
                <th>Fecha Solicitud</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {candidatos.map((c) => (
                <tr key={c.id}>
                  <td className="cand-cedula">{c.cedula}</td>
                  <td>
                    <strong>{c.nombre} {c.apellido}</strong>
                    {c.cantidad_postulaciones > 1 && (
                      <span className="badge badge-orange" style={{ marginLeft: '8px', fontSize: '0.75rem', padding: '2px 6px' }}>
                        Reincidente ({c.cantidad_postulaciones})
                      </span>
                    )}
                  </td>
                  <td>{c.empleo_solicitado || <span className="text-muted">No especificado</span>}</td>
                  <td>
                    <span className={`badge ${getBadgeClass(c.estado_actual)}`}>
                      {c.estado_actual}
                    </span>
                  </td>
                  <td className="text-muted">
                    {c.created_at
                      ? new Date(c.created_at).toLocaleDateString('es-VE')
                      : '-'}
                  </td>
                  <td className="cand-actions-cell">
                    <button
                      className="btn-action"
                      onClick={() => navigate(`/dashboard/expediente/${c.cedula}`)}
                    >
                      Ver expediente <FiArrowRight size={12} />
                    </button>
                    <button
                      className="btn-action-icon"
                      onClick={() => handleDescargarFicha(c.cedula, c.nombre, c.apellido)}
                      disabled={descargandoCedula === c.cedula}
                      title="Descargar Ficha Técnica / Solicitud en PDF"
                    >
                      {descargandoCedula === c.cedula ? (
                        <FiLoader className="spin-icon" size={13} />
                      ) : (
                        <FiDownload size={13} />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Controles de paginación del servidor */}
      {totalPages > 1 && (
        <div className="cand-paginacion">
          <button
            className="cand-pag-btn"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <FiChevronLeft /> Anterior
          </button>
          <span className="cand-pag-info">
            Página <strong>{page}</strong> de <strong>{totalPages}</strong>
          </span>
          <button
            className="cand-pag-btn"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Siguiente <FiChevronRight />
          </button>
        </div>
      )}

    </div>
  );
};

export default CandidatosPage;

