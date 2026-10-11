// ============================================================
// PÁGINA DE EXPEDIENTE DIGITAL DEL CANDIDATO (ExpedientePage.jsx)
// Sistema SICS - Hotel Margarita Village
//
// Muestra la vista integral de 360° de un candidato en particular.
// Organizada en pestañas:
//   1. Perfil y Memoria: Datos personales, solicitud, CVs y traza de historiales.
//   2. Evaluación de Entrevista: Módulo conductual de valoración de 6 criterios.
// Permite modificar manualmente el estado del aspirante y descargar sus documentos.
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiDownload, FiCheckCircle, FiXCircle,
  FiClock, FiEdit2, FiUser, FiClipboard, FiFile,
  FiLoader, FiAlertTriangle, FiMessageSquare, FiFileText
} from 'react-icons/fi';
import api from '../api/axios';
import EvaluacionTab from '../components/EvaluacionTab';
import PruebasTab from '../components/PruebasTab';
import './ExpedientePage.css';

const ExpedientePage = () => {
  // Extrae el parámetro dinámico :cedula desde la URL
  const { cedula } = useParams();
  const navigate = useNavigate();

  // Estados de datos principales
  const [aspirante, setAspirante] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [tabActiva, setTabActiva] = useState('perfil');
  const [cargando, setCargando] = useState(true);
  const [descargandoFicha, setDescargandoFicha] = useState(false);

  // Estados para la ventana modal de cambio manual de estado
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [motivo, setMotivo] = useState('');
  const [notasModal, setNotasModal] = useState('');
  const [guardando, setGuardando] = useState(false);

  // EFECTO: Carga los datos del aspirante e historial al cambiar la cédula
  useEffect(() => { cargarDatos(); }, [cedula]);

  // Consulta simultánea a la API REST para perfil e historial
  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [resAsp, resHist] = await Promise.all([
        api.get(`/api/aspirantes/${cedula}`),
        api.get(`/api/aspirantes/${cedula}/historial`)
      ]);
      
      let dataAsp = resAsp.data;
      if (typeof dataAsp.form_data === 'string') {
        try {
          dataAsp.form_data = JSON.parse(dataAsp.form_data);
        } catch(e) {}
      }

      setAspirante(dataAsp);
      setHistorial(resHist.data);
      setNuevoEstado(dataAsp.estado || 'Postulado');
    } catch (error) {
      console.error('Error al cargar el expediente:', error);
      alert('No se pudo recuperar la información del expediente.');
      navigate('/dashboard');
    } finally {
      setCargando(false);
    }
  };

  // Envía la actualización de estado a la API y registra el motivo en la Memoria Institucional
  const handleSubmitEstado = async (e) => {
    e.preventDefault();
    if (nuevoEstado === 'Descartado' && !motivo.trim()) {
      alert('Por favor indique el motivo del rechazo.');
      return;
    }
    setGuardando(true);
    try {
      await api.put(`/api/aspirantes/${cedula}/estado`, {
        estado: nuevoEstado,
        notas: notasModal,
        motivo_rechazo: motivo
      });
      setMostrarModal(false);
      setMotivo('');
      setNotasModal('');
      cargarDatos();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al cambiar el estado del candidato.');
    } finally {
      setGuardando(false);
    }
  };

  // Mapeo dinámico de clases CSS para insignias de estado
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

  // Retorna el icono correspondiente según el resultado de cada evento del historial
  const getIconoHistorial = (estadoNuevo) => {
    switch (estadoNuevo) {
      case 'Seleccionado': return <FiCheckCircle style={{ color: '#15803d' }} size={12} />;
      case 'Descartado':   return <FiXCircle style={{ color: '#b91c1c' }} size={12} />;
      default:             return <FiClock style={{ color: '#2563eb' }} size={12} />;
    }
  };

  // Formateador de fechas a estándar en español venezolano
  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return '—';
    return new Date(fechaStr).toLocaleDateString('es-VE', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  // DESCARGA SEGURA DE ARCHIVOS:
  // Emplea Axios con respuesta tipo 'blob' inyectando el token JWT
  // para descargar físicamente el documento desde la API de forma protegida.
  const handleDescargar = async (nombreReal, nombreOriginal) => {
    try {
      const response = await api.get(`/api/uploads/${nombreReal}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', nombreOriginal);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('No se pudo descargar el documento seleccionado.');
      console.error(err);
    }
  };

  // DESCARGA DE FICHA TÉCNICA / SOLICITUD DE EMPLEO EN PDF:
  // Descarga el documento oficial formateado con logo, tablas y firmas,
  // disponible en cualquier etapa del proceso (incluso antes de entrevistas o pruebas).
  const handleDescargarFicha = async () => {
    setDescargandoFicha(true);
    try {
      const response = await api.get(`/api/aspirantes/${cedula}/ficha-pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Ficha_Candidato_${aspirante?.nombre || ''}_${aspirante?.apellido || ''}_${cedula}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('No se pudo generar la ficha técnica en PDF.');
      console.error(err);
    } finally {
      setDescargandoFicha(false);
    }
  };


  // ── LOADING ──
  if (cargando) {
    return (
      <div className="expediente-spinner">
        <FiLoader className="spin-icon" size={28} />
        <p>Cargando expediente...</p>
      </div>
    );
  }
  if (!aspirante) return null;

  // ── RENDER ──
  return (
    <div className="expediente-page">

      {/* ── VOLVER ── */}
      <button className="btn-back" onClick={() => navigate(-1)}>
        <FiArrowLeft size={14} /> Volver
      </button>

      {/* ── PERFIL HEADER ── */}
      <div className="perfil-header">
        <div className="perfil-title">
          <div className="perfil-avatar">
            {aspirante.nombre?.charAt(0)}{aspirante.apellido?.charAt(0)}
          </div>
          <div>
            <h1>{aspirante.nombre} {aspirante.apellido}</h1>
            <p className="cedula-label">C.I. {aspirante.cedula}</p>
          </div>
        </div>
        <div className="perfil-actions">
          <button
            className="btn-secondary"
            onClick={handleDescargarFicha}
            disabled={descargandoFicha}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.5rem 1rem' }}
            title="Descargar Ficha Técnica / Solicitud de Empleo en PDF con membrete oficial"
          >
            {descargandoFicha ? <FiLoader className="spin-icon" size={13} /> : <FiDownload size={13} />}
            <span>{descargandoFicha ? 'Generando PDF...' : 'Descargar Ficha Técnica'}</span>
          </button>
          <span className={`badge badge-lg ${getBadgeClass(aspirante.estado)}`}>
            {aspirante.estado || 'Postulado'}
          </span>
          <button className="btn-primary" onClick={() => setMostrarModal(true)}>
            <FiEdit2 size={13} /> Cambiar estado
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${tabActiva === 'perfil' ? 'tab-activa' : ''}`}
          onClick={() => setTabActiva('perfil')}
        >
          <FiUser size={14} /> Perfil y Memoria
        </button>
        <button
          className={`tab-btn ${tabActiva === 'entrevista' ? 'tab-activa' : ''}`}
          onClick={() => setTabActiva('entrevista')}
        >
          <FiClipboard size={14} /> Evaluación de entrevista
        </button>
        <button
          className={`tab-btn ${tabActiva === 'pruebas' ? 'tab-activa' : ''}`}
          onClick={() => setTabActiva('pruebas')}
        >
          <FiFileText size={14} /> Pruebas Psicotécnicas
        </button>
      </div>

      {/* ── TAB: PERFIL ── */}
      {tabActiva === 'perfil' && (
        <div className="expediente-grid">

          {/* COLUMNA IZQUIERDA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Datos Personales */}
            <div className="card seccion">
              <h2 className="seccion-title">Datos personales</h2>
              <div className="info-grid">
                {[
                  ['Edad', aspirante.edad || aspirante.form_data?.edad],
                  ['Sexo', aspirante.sexo || aspirante.form_data?.sexo],
                  ['Teléfono', aspirante.telefono || aspirante.form_data?.telefono],
                  ['Correo electrónico', aspirante.correo || aspirante.email || aspirante.form_data?.correo],
                  ['Dirección', aspirante.direccion || aspirante.form_data?.direccion],
                  ['Lugar de nacimiento', aspirante.lugar_nacimiento || aspirante.form_data?.lugar_nacimiento],
                  ['Municipio residencia', aspirante.municipio || aspirante.municipio_postulacion || aspirante.form_data?.municipio],
                  ['Estado civil', aspirante.estado_civil || aspirante.form_data?.estado_civil],
                  ['Carga familiar', aspirante.carga_familiar || aspirante.form_data?.carga_familiar],
                ].map(([label, value]) => (
                  <div className="info-item" key={label}>
                    <span className="info-label">{label}</span>
                    <span className="info-value">{value || '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Perfil Profesional */}
            {aspirante.empleo_solicitado && (
              <div className="card seccion">
                <h2 className="seccion-title">Perfil profesional y postulación</h2>
                <div className="info-grid">
                  {[
                    ['Cargo solicitado', aspirante.empleo_solicitado || aspirante.form_data?.empleo_solicitado],
                    ['Aspiración salarial', aspirante.sueldo_aspira || aspirante.form_data?.sueldo_aspira],
                    ['Grado de instrucción', aspirante.formacion || aspirante.form_data?.formacion],
                    ['¿Trabaja actualmente?', aspirante.trabaja_actualmente || aspirante.form_data?.trabaja_actualmente],
                    ['Disponibilidad rotativa', (aspirante.disponibilidad_rotativa === true || String(aspirante.disponibilidad_rotativa).toLowerCase() === 'sí' || String(aspirante.disponibilidad_rotativa).toLowerCase() === 'si') ? 'Sí' : ((aspirante.disponibilidad_rotativa === false || String(aspirante.disponibilidad_rotativa).toLowerCase() === 'no') ? 'No' : '—')],
                    ['Disp. fines de semana', (aspirante.disponibilidad_fines === true || String(aspirante.disponibilidad_fines).toLowerCase() === 'sí' || String(aspirante.disponibilidad_fines).toLowerCase() === 'si') ? 'Sí' : ((aspirante.disponibilidad_fines === false || String(aspirante.disponibilidad_fines).toLowerCase() === 'no') ? 'No' : '—')],
                  ].map(([label, value]) => (
                    <div className="info-item" key={label}>
                      <span className="info-label">{label}</span>
                      <span className="info-value">{value !== null && value !== undefined ? String(value) : '—'}</span>
                    </div>
                  ))}
                </div>
                {[
                  ['Experiencia en últimos empleos', aspirante.experiencia_ultimos_empleos || aspirante.form_data?.experiencia_ultimos_empleos],
                  ['Habilidades y destrezas', aspirante.habilidades || aspirante.form_data?.habilidades],
                  ['Motivación', aspirante.motivacion || aspirante.form_data?.motivacion],
                  ['Fortalezas y oportunidades', aspirante.fortalezas || aspirante.form_data?.fortalezas],
                  ['Referencias', aspirante.referencias || aspirante.form_data?.referencias],
                ].map(([label, value]) => value ? (
                  <div className="info-block" key={label}>
                    <span className="info-label">{label}</span>
                    <p className="info-text">{value}</p>
                  </div>
                ) : null)}
              </div>
            )}

            {/* Logística */}
            <div className="card seccion">
              <h2 className="seccion-title">Logística y uniformes</h2>
              <div className="info-grid">
                {[
                  ['Medio de transporte', aspirante.medio_transporte],
                  ['Información bancaria', aspirante.data_bancaria],
                  ...(aspirante.form_data?.tallas ? [
                    ['Talla camisa', aspirante.form_data.tallas.camisa],
                    ['Talla pantalón', aspirante.form_data.tallas.pantalon],
                    ['Talla zapatos', aspirante.form_data.tallas.zapatos],
                  ] : []),
                ].map(([label, value]) => (
                  <div className="info-item" key={label}>
                    <span className="info-label">{label}</span>
                    <span className="info-value">{value || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Documentos */}
            <div className="card seccion">
              <h2 className="seccion-title">Documentos adjuntos</h2>
              {aspirante.documentos && aspirante.documentos.length > 0 ? (
                <ul className="doc-list">
                  {aspirante.documentos.map((doc, i) => (
                    <li key={i} className="doc-item">
                      <div className="doc-file-info">
                        <FiFile size={14} />
                        <span className="doc-name">{doc.nombre_archivo}</span>
                      </div>
                      <button
                        className="btn-download"
                        onClick={() => handleDescargar(doc.nombre_real || doc.nombre_archivo, doc.nombre_archivo)}
                      >
                        <FiDownload size={12} /> Descargar
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: 'var(--texto-mut)', fontSize: 14, margin: 0 }}>
                  Sin documentos adjuntos.
                </p>
              )}
            </div>

            {/* Memoria Institucional */}
            <div className="card seccion">
              <h2 className="seccion-title">Memoria institucional</h2>
              {historial.length > 0 ? (
                <div className="timeline">
                  {historial.map((evento, i) => (
                    <div key={i} className="timeline-item">
                      <div className="timeline-icon">
                        {getIconoHistorial(evento.estado_nuevo)}
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span className={`badge ${getBadgeClass(evento.estado_nuevo)}`}>
                            {evento.estado_nuevo}
                          </span>
                          <span className="timeline-date">{formatearFecha(evento.created_at)}</span>
                        </div>
                        {evento.cargo_solicitado && (
                          <p className="timeline-role">
                            Cargo: {evento.cargo_solicitado}
                          </p>
                        )}
                        {evento.motivo_rechazo && (
                          <div className="timeline-reason">
                            <div className="timeline-reason-label">
                              <FiAlertTriangle size={10} /> Motivo
                            </div>
                            {evento.motivo_rechazo}
                          </div>
                        )}
                        {evento.notas && (
                          <p className="timeline-notes">
                            <FiMessageSquare size={11} style={{ marginRight: 4 }} />
                            {evento.notas}
                          </p>
                        )}
                        <p className="timeline-user">
                          <FiUser size={10} /> Registrado por: {evento.usuario_nombre || 'Sistema'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--texto-mut)', fontSize: 14, margin: 0 }}>
                  Sin interacciones previas registradas.
                </p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── TAB: ENTREVISTA ── */}
      {tabActiva === 'entrevista' && (
        <div className="card-tab-content">
          <EvaluacionTab cedula={cedula} />
        </div>
      )}

      {/* ── TAB: PRUEBAS ── */}
      {tabActiva === 'pruebas' && (
        <div className="card-tab-content">
          <PruebasTab cedula={cedula} />
        </div>
      )}

      {/* ── MODAL CAMBIO DE ESTADO ── */}
      {mostrarModal && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setMostrarModal(false); }}
        >
          <div className="modal-content">
            <h3>Actualizar estado del candidato</h3>
            <form onSubmit={handleSubmitEstado}>

              <div className="modal-form-group">
                <label className="modal-label">Nuevo estado</label>
                <select
                  value={nuevoEstado}
                  onChange={(e) => setNuevoEstado(e.target.value)}
                  className="modal-input"
                >
                  <option value="Postulado">Postulado</option>
                  <option value="En revisión">En revisión</option>
                  <option value="Citado">Citado a entrevista / examen</option>
                  <option value="Seleccionado">Seleccionado</option>
                  <option value="Descartado">Descartado</option>
                </select>
              </div>

              {nuevoEstado === 'Descartado' && (
                <div className="modal-form-group">
                  <label className="modal-label">
                    Motivo de rechazo <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="modal-input"
                    placeholder="Describe el motivo por el que el candidato es descartado..."
                    required
                    rows={3}
                  />
                </div>
              )}

              <div className="modal-form-group">
                <label className="modal-label">Notas adicionales (opcional)</label>
                <textarea
                  value={notasModal}
                  onChange={(e) => setNotasModal(e.target.value)}
                  className="modal-input"
                  placeholder="Observaciones internas sobre este cambio..."
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancelar" onClick={() => setMostrarModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-guardar" disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar cambio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ExpedientePage;
