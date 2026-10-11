import React, { useState, useEffect } from 'react';
import { FiFileText, FiLink, FiCheckCircle, FiClock, FiPlus, FiEye, FiX, FiCheck, FiAlertCircle } from 'react-icons/fi';
import api from '../api/axios';
import './PruebasTab.css';

const PruebasTab = ({ cedula }) => {
  const [examenes, setExamenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);

  // Estado para el modal de respuestas
  const [examenSeleccionado, setExamenSeleccionado] = useState(null);
  const [detalleRespuestas, setDetalleRespuestas] = useState(null);
  const [cargandoRespuestas, setCargandoRespuestas] = useState(false);

  useEffect(() => {
    cargarExamenes();
  }, [cedula]);

  const cargarExamenes = async () => {
    setCargando(true);
    try {
      const res = await api.get(`/api/aspirantes/${cedula}/examenes`);
      setExamenes(res.data);
    } catch (error) {
      console.error('Error al cargar exámenes:', error);
    } finally {
      setCargando(false);
    }
  };

  const generarExamen = async () => {
    setGenerando(true);
    try {
      const res = await api.post(`/api/aspirantes/${cedula}/examenes`);
      alert(res.data.mensaje);
      cargarExamenes();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al generar examen');
    } finally {
      setGenerando(false);
    }
  };

  const copiarEnlace = (token) => {
    const link = `${window.location.origin}/evaluacion/${token}`;
    navigator.clipboard.writeText(link);
    alert('Enlace del examen copiado al portapapeles:\n' + link);
  };

  const abrirModalRespuestas = async (examenId) => {
    setCargandoRespuestas(true);
    setExamenSeleccionado(examenId);
    try {
      const res = await api.get(`/api/examenes/${examenId}/respuestas`);
      setDetalleRespuestas(res.data);
    } catch (error) {
      alert(error.response?.data?.error || 'Error al cargar respuestas del examen');
      setExamenSeleccionado(null);
    } finally {
      setCargandoRespuestas(false);
    }
  };

  const cerrarModal = () => {
    setExamenSeleccionado(null);
    setDetalleRespuestas(null);
  };

  if (cargando) return <p className="text-muted">Cargando pruebas...</p>;

  return (
    <div className="pruebas-tab-container">
      <div className="pruebas-header">
        <div>
          <h3>Pruebas Psicotécnicas</h3>
          <p className="text-muted">Gestión de exámenes asignados al candidato.</p>
        </div>
        <button className="btn-primary" onClick={generarExamen} disabled={generando}>
          {generando ? 'Generando...' : <><FiPlus /> Generar Nuevo Examen</>}
        </button>
      </div>

      <div className="examenes-lista">
        {examenes.length === 0 ? (
          <div className="empty-state">
            <FiFileText size={32} />
            <p>Este candidato aún no tiene exámenes asignados.</p>
          </div>
        ) : (
          examenes.map(ex => (
            <div key={ex.id} className="examen-card">
              <div className="examen-info">
                <h4>Examen Psicotécnico #{ex.id}</h4>
                <p><strong>Fecha emisión:</strong> {new Date(ex.fecha_emision).toLocaleString()}</p>
                <p><strong>Vencimiento:</strong> {new Date(ex.fecha_vencimiento).toLocaleString()}</p>
                <div className="examen-estado">
                  {ex.estado === 'Emitido' ? (
                    <span className="badge-blue"><FiClock /> {ex.estado}</span>
                  ) : (
                    <span className="badge-green"><FiCheckCircle /> {ex.estado} (Puntaje: {ex.puntaje || 0})</span>
                  )}
                </div>
              </div>
              <div className="examen-actions">
                <button 
                  className="btn-secondary" 
                  onClick={() => copiarEnlace(ex.token_unico)}
                  title="Copiar enlace para enviar al candidato"
                >
                  <FiLink /> Copiar Enlace
                </button>
                {ex.estado === 'Finalizado' && (
                  <button 
                    className="btn-primary-outline"
                    onClick={() => abrirModalRespuestas(ex.id)}
                    title="Ver respuestas respondidas por el candidato"
                  >
                    <FiEye /> Ver Respuestas
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal para ver respuestas */}
      {examenSeleccionado && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <FiFileText /> Respuestas del Examen #{examenSeleccionado}
              </h3>
              <button className="btn-close" onClick={cerrarModal}>
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              {cargandoRespuestas ? (
                <p className="text-muted text-center py-4">Cargando detalle de respuestas...</p>
              ) : detalleRespuestas ? (
                <div>
                  <div className="resumen-examen-banner">
                    <p><strong>Candidato:</strong> {detalleRespuestas.examen.nombre} {detalleRespuestas.examen.apellido} (C.I. {detalleRespuestas.examen.cedula})</p>
                    <p><strong>Puntaje Obtenido:</strong> <span className="puntaje-destacado">{detalleRespuestas.examen.puntaje || 0} pts</span></p>
                  </div>

                  <div className="lista-respuestas-detalle">
                    {detalleRespuestas.preguntas.map((p, idx) => (
                      <div key={p.examen_pregunta_id} className={`item-respuesta ${p.es_correcta === true ? 'correcta' : p.es_correcta === false ? 'incorrecta' : 'abierta'}`}>
                        <div className="pregunta-header">
                          <span className="num-pregunta">#{idx + 1}</span>
                          <span className="tipo-tag">{p.tipo}</span>
                          {p.tipo === 'Desarrollo abierto' ? (
                            <span className="pts-tag cualitativa">Pregunta Cualitativa</span>
                          ) : (
                            <span className="pts-tag">{p.puntaje_obtenido !== null ? p.puntaje_obtenido : 0} / {p.puntaje_max} pts</span>
                          )}
                        </div>
                        <p className="pregunta-texto">{p.pregunta}</p>

                        <div className="desglose-respuestas">
                          <div className="caja-respuesta candidato">
                            <small>Respuesta del candidato:</small>
                            <p>
                              {p.respuesta_candidato ? (
                                <>
                                  {p.es_correcta === true && <FiCheck className="icono-ok" />}
                                  {p.es_correcta === false && <FiX className="icono-err" />}
                                  {p.respuesta_candidato}
                                </>
                              ) : (
                                <em>Sin responder</em>
                              )}
                            </p>
                          </div>

                          {p.respuesta_correcta && (
                            <div className="caja-respuesta oficial">
                              <small>Respuesta correcta esperada:</small>
                              <p>{p.respuesta_correcta}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted text-center py-4">No se encontraron detalles.</p>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={cerrarModal}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PruebasTab;

