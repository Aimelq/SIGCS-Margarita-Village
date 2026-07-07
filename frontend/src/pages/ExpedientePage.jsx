import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiDownload, FiCheckCircle, FiXCircle, FiClock, FiEdit2 } from 'react-icons/fi';
import api from '../api/axios';
import './ExpedientePage.css';

const ExpedientePage = () => {
  // useParams extrae los parámetros de la URL. Si la ruta es /dashboard/expediente/123, 
  // entonces "cedula" valdrá "123".
  const { cedula } = useParams();
  const navigate = useNavigate();
  
  // ================= ESTADOS =================
  const [expediente, setExpediente] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  // Estados para el Modal de Cambiar Estado
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [motivo, setMotivo] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  // ================= EFECTOS =================
  // Carga los datos apenas entras a la página
  useEffect(() => {
    cargarExpedienteCompleto();
  }, [cedula]);

  const cargarExpedienteCompleto = async () => {
    setCargando(true);
    try {
      // Hago las 2 peticiones en paralelo: una para los datos del candidato y otra para su historial
      const [resExp, resHist] = await Promise.all([
        api.get(`/api/aspirantes/${cedula}/expediente`),
        api.get(`/api/aspirantes/${cedula}/historial`)
      ]);
      setExpediente(resExp.data);
      setHistorial(resHist.data);
      // Pongo el estado actual por defecto en el select del modal
      setNuevoEstado(resExp.data.aspirante.estado_actual);
    } catch (error) {
      console.error("Error cargando expediente", error);
      alert("Error al cargar el expediente. Puede que el candidato no exista.");
      navigate('/dashboard');
    } finally {
      setCargando(false);
    }
  };

  // ================= FUNCIONES =================
  
  // Enviar el cambio de estado al backend
  const handleSubmitEstado = async (e) => {
    e.preventDefault();
    if (nuevoEstado === 'Descartado' && !motivo.trim()) {
      alert("Debes indicar un motivo de rechazo si vas a descartar al candidato.");
      return;
    }

    setGuardando(true);
    try {
      await api.put(`/api/aspirantes/${cedula}/estado`, {
        nuevo_estado: nuevoEstado,
        motivo: motivo,
        notas: notas
      });
      // Si fue exitoso, cierro el modal y recargo los datos para que se vea reflejado
      setMostrarModal(false);
      setMotivo('');
      setNotas('');
      cargarExpedienteCompleto();
    } catch (error) {
      alert(error.response?.data?.error || "Error al cambiar estado");
    } finally {
      setGuardando(false);
    }
  };

  // Helper para asignar un color a los badges
  const getBadgeClass = (estado) => {
    switch(estado) {
      case 'Postulado': return 'badge-blue';
      case 'En revisión': return 'badge-yellow';
      case 'Citado': return 'badge-orange';
      case 'Seleccionado': return 'badge-green';
      case 'Descartado': return 'badge-red';
      default: return 'badge-gray';
    }
  };

  // Helper para mostrar un icono específico en el historial
  const getHistorialIcon = (veredicto) => {
    switch(veredicto) {
      case 'Seleccionado': return <FiCheckCircle className="text-green-600" />;
      case 'Descartado': return <FiXCircle className="text-red-600" />;
      default: return <FiClock className="text-blue-600" />;
    }
  };

  // ================= RENDERIZADO =================
  if (cargando) return <div className="cargando-dashboard">Cargando expediente detallado...</div>;
  if (!expediente) return null;

  const { aspirante, postulaciones, documentos } = expediente;
  // Si tiene postulaciones, tomo la más reciente (la primera en la lista)
  const ultimaPostulacion = postulaciones.length > 0 ? postulaciones[0] : null;

  return (
    <div className="expediente-page">
      {/* Botón para regresar atrás */}
      <button className="btn-back" onClick={() => navigate(-1)}>
        <FiArrowLeft /> Volver
      </button>

      {/* CABECERA DEL PERFIL */}
      <div className="perfil-header card">
        <div className="perfil-title">
          <h1>{aspirante.nombre} {aspirante.apellido}</h1>
          <span className={`badge ${getBadgeClass(aspirante.estado_actual)}`}>
            {aspirante.estado_actual}
          </span>
        </div>
        <div className="perfil-actions">
          <p className="cedula-label">C.I: {aspirante.cedula}</p>
          <button className="btn-primary" onClick={() => setMostrarModal(true)}>
            <FiEdit2 /> Cambiar Estado
          </button>
        </div>
      </div>

      <div className="expediente-grid">
        
        {/* COLUMNA IZQUIERDA: DATOS PRINCIPALES */}
        <div className="col-left">
          <div className="card seccion">
            <h2>Datos Personales</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Edad</span>
                <span className="info-value">{aspirante.edad || '-'} años</span>
              </div>
              <div className="info-item">
                <span className="info-label">Sexo</span>
                <span className="info-value">{aspirante.sexo || '-'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Teléfono</span>
                <span className="info-value">{aspirante.telefono}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Correo</span>
                <span className="info-value">{aspirante.correo}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Dirección</span>
                <span className="info-value">{aspirante.direccion}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Lugar de Nacimiento</span>
                <span className="info-value">{aspirante.lugar_nacimiento || '-'}</span>
              </div>
            </div>
          </div>

          {ultimaPostulacion && (
            <div className="card seccion">
              <h2>Postulación Reciente</h2>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Cargo Solicitado</span>
                  <span className="info-value"><strong>{ultimaPostulacion.empleo_solicitado}</strong></span>
                </div>
                <div className="info-item">
                  <span className="info-label">Aspiración Salarial</span>
                  <span className="info-value">{ultimaPostulacion.sueldo_aspira}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Trabaja Actualmente</span>
                  <span className="info-value">{ultimaPostulacion.trabaja_actualmente}</span>
                </div>
              </div>
              
              <div className="info-block mt-4">
                <span className="info-label">Habilidades y Destrezas</span>
                <p className="info-text">{ultimaPostulacion.habilidades}</p>
              </div>
              
              <div className="info-block mt-4">
                <span className="info-label">Experiencia en últimos empleos</span>
                <p className="info-text">{ultimaPostulacion.experiencia_ultimos_empleos}</p>
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: DOCUMENTOS E HISTORIAL */}
        <div className="col-right">
          
          <div className="card seccion">
            <h2>Documentos Adjuntos</h2>
            {documentos.length > 0 ? (
              <ul className="doc-list">
                {documentos.map((doc, i) => (
                  <li key={i} className="doc-item">
                    <span>{doc.nombre_original}</span>
                    {/* Al hacer clic en descargar, genero una URL artificial por seguridad.
                        (Idealmente el backend daría un endpoint GET para archivos protegidos) */}
                    <button className="btn-download" onClick={() => alert("Función de descarga segura por implementar en el backend")}>
                      <FiDownload /> Descargar PDF
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No hay documentos adjuntos.</p>
            )}
          </div>

          <div className="card seccion">
            <h2>Memoria Institucional (Historial)</h2>
            {historial.length > 0 ? (
              <div className="timeline">
                {historial.map((evento, i) => (
                  <div key={i} className="timeline-item">
                    <div className="timeline-icon">
                      {getHistorialIcon(evento.veredicto)}
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className={`badge ${getBadgeClass(evento.veredicto)}`}>{evento.veredicto}</span>
                        <span className="timeline-date">{evento.fecha}</span>
                      </div>
                      <p className="timeline-role">Cargo: {evento.cargo_solicitado}</p>
                      
                      {/* Si hay motivo de rechazo, lo pinto en rojo */}
                      {evento.motivo_rechazo && (
                        <p className="timeline-reason text-red-600">
                          <strong>Motivo de rechazo:</strong> {evento.motivo_rechazo}
                        </p>
                      )}
                      
                      {/* Si hay notas adicionales */}
                      {evento.notas && (
                        <p className="timeline-notes">
                          <em>"{evento.notas}"</em>
                        </p>
                      )}
                      <p className="timeline-user">Registrado por: {evento.reclutador || 'Sistema'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted">Este candidato no tiene interacciones previas.</p>
            )}
          </div>

        </div>
      </div>

      {/* ================= MODAL DE CAMBIAR ESTADO ================= */}
      {/* Es un div sobrepuesto a todo (position fixed) con un fondo semi-transparente */}
      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Cambiar Estado de Selección</h3>
            <form onSubmit={handleSubmitEstado}>
              <div className="form-group">
                <label>Nuevo Estado</label>
                <select 
                  value={nuevoEstado} 
                  onChange={(e) => setNuevoEstado(e.target.value)}
                  className="modal-input"
                >
                  <option value="Postulado">Postulado (Estado inicial)</option>
                  <option value="En revisión">En revisión (Llamando, chequeando refs)</option>
                  <option value="Citado">Citado a entrevista / Examen</option>
                  <option value="Seleccionado">Seleccionado (Apto)</option>
                  <option value="Descartado">Descartado (No Apto)</option>
                </select>
              </div>

              {/* Si selecciona "Descartado", fuerzo a que escriba un motivo */}
              {nuevoEstado === 'Descartado' && (
                <div className="form-group">
                  <label>Motivo de Rechazo (Obligatorio) *</label>
                  <textarea 
                    value={motivo} 
                    onChange={(e) => setMotivo(e.target.value)}
                    className="modal-input"
                    placeholder="Ej: No cumple perfil, mala actitud, etc."
                    required
                  ></textarea>
                </div>
              )}

              <div className="form-group">
                <label>Notas Adicionales (Opcional)</label>
                <textarea 
                  value={notas} 
                  onChange={(e) => setNotas(e.target.value)}
                  className="modal-input"
                  placeholder="Anotaciones internas sobre este cambio de estado"
                ></textarea>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancelar" onClick={() => setMostrarModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-guardar" disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar Cambio'}
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
