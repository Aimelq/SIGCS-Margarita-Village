// ============================================================
// COMPONENTE DE EVALUACIÓN CONDUCTUAL DE ENTREVISTAS (EvaluacionTab)
// Sistema SICS - Hotel Margarita Village
//
// Permite a los reclutadores calificar al candidato en 6 competencias clave:
// Imagen, Léxico, Vocablo, Lenguaje Corporal, Sentido Común y Nivel de Raciocinio.
// Envía las valoraciones al backend para procesar el Algoritmo de Mayoría Simple
// y mostrar la justificación automatizada en lenguaje natural (NLG).
// ============================================================

import { useState, useEffect } from 'react';
import {
  FiCheckCircle, FiXCircle, FiClipboard, FiLoader,
  FiAlertTriangle, FiRotateCcw, FiSave, FiUser, FiCalendar
} from 'react-icons/fi';
import api from '../api/axios';
import './EvaluacionTab.css';

const EvaluacionTab = ({ cedula }) => {
  // Catálogo de criterios recuperados desde la base de datos
  const [criterios, setCriterios] = useState([]);
  
  // Estado local para los votos y comentarios individuales por cada criterio
  const [decisiones, setDecisiones] = useState({});
  const [notasGenerales, setNotasGenerales] = useState('');
  
  // Lista de evaluaciones pasadas realizadas al mismo aspirante
  const [evaluacionesAnteriores, setEvaluacionesAnteriores] = useState([]);
  
  // Estados de carga y transmisión asíncrona
  const [cargandoCriterios, setCargandoCriterios] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [error, setError] = useState(null);

  // EFECTO: Carga los criterios activos y el historial de evaluaciones del candidato
  useEffect(() => {
    cargarCriterios();
    cargarEvaluacionesAnteriores();
  }, [cedula]);

  // Consulta los criterios habilitados en el sistema desde GET /api/criterios
  const cargarCriterios = async () => {
    try {
      setCargandoCriterios(true);
      const response = await api.get('/api/criterios');
      setCriterios(response.data);
      const init = {};
      response.data.forEach(c => { init[c.id] = { decision: null, comentario: '' }; });
      setDecisiones(init);
    } catch {
      setError('Error al obtener la lista de criterios de evaluación.');
    } finally {
      setCargandoCriterios(false);
    }
  };

  // Consulta el historial de entrevistas previas mediante GET /api/evaluaciones/<cedula>
  const cargarEvaluacionesAnteriores = async () => {
    try {
      const response = await api.get(`/api/evaluaciones/${cedula}`);
      setEvaluacionesAnteriores(response.data);
    } catch {
      setEvaluacionesAnteriores([]);
    }
  };

  // Registra el voto ('elegible' o 'no_elegible') asignado a un criterio específico
  const handleDecision = (criterioId, decision) => {
    setDecisiones(prev => ({
      ...prev,
      [criterioId]: { ...prev[criterioId], decision }
    }));
  };

  // Registra la observación en texto del entrevistador sobre un criterio
  const handleComentario = (criterioId, comentario) => {
    setDecisiones(prev => ({
      ...prev,
      [criterioId]: { ...prev[criterioId], comentario }
    }));
  };

  // Envía la evaluación completa al backend para ejecutar el Motor de Decisión y NLG
  const handleEnviar = async () => {
    const sinDecidir = criterios.filter(c => !decisiones[c.id]?.decision);
    if (sinDecidir.length > 0) {
      alert(`Por favor evalúe todos los criterios antes de guardar.\nPendientes: ${sinDecidir.map(c => c.nombre).join(', ')}`);
      return;
    }
    setEnviando(true);
    setResultado(null);
    setError(null);
    try {
      const criteriosPayload = criterios.map(c => ({
        criterio_id: c.id,
        decision: decisiones[c.id].decision,
        comentario: decisiones[c.id].comentario
      }));
      const response = await api.post(`/api/evaluaciones/${cedula}`, {
        criterios: criteriosPayload,
        notas_generales: notasGenerales
      });
      setResultado(response.data);
      setMostrarFormulario(false);
      await cargarEvaluacionesAnteriores();
    } catch (err) {
      setError(err.response?.data?.error || 'Ocurrió un error al registrar la evaluación.');
    } finally {
      setEnviando(false);
    }
  };

  // Restablece el formulario para iniciar una nueva sesión de entrevista
  const iniciarNuevaEntrevista = () => {
    const init = {};
    criterios.forEach(c => { init[c.id] = { decision: null, comentario: '' }; });
    setDecisiones(init);
    setNotasGenerales('');
    setResultado(null);
    setError(null);
    setMostrarFormulario(true);
  };

  const formatearFecha = (fechaStr) => {
    return new Date(fechaStr).toLocaleDateString('es-VE', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const elegiblesCount = Object.values(decisiones).filter(d => d.decision === 'elegible').length;
  const noElegiblesCount = Object.values(decisiones).filter(d => d.decision === 'no_elegible').length;

  if (cargandoCriterios) {
    return (
      <div className="eval-loading">
        <FiLoader className="eval-spin" size={22} />
        <p>Cargando catálogo de criterios...</p>
      </div>
    );
  }


  return (
    <div className="evaluacion-tab">

      {/* ── VEREDICTO FINAL ── */}
      {resultado && (
        <div className={`veredicto-card ${resultado.veredicto === 'Apto' ? 'veredicto-apto' : 'veredicto-no-apto'}`}>
          <div className="veredicto-header">
            {resultado.veredicto === 'Apto'
              ? <FiCheckCircle size={28} className="veredicto-ico apto" />
              : <FiXCircle size={28} className="veredicto-ico no-apto" />
            }
            <div>
              <h3 className="veredicto-titulo">Veredicto: {resultado.veredicto}</h3>
              <div className="veredicto-scores">
                <span className="score-badge score-green">
                  <FiCheckCircle size={12} /> {resultado.elegible_count} Elegibles
                </span>
                <span className="score-badge score-red">
                  <FiXCircle size={12} /> {resultado.no_elegible_count} No elegibles
                </span>
              </div>
            </div>
          </div>
          <p className="veredicto-justificacion">{resultado.justificacion}</p>
          <p className="veredicto-estado-label">
            Estado actualizado a: <strong>{resultado.estado_candidato}</strong>
          </p>
          <button className="btn-nueva-eval" onClick={iniciarNuevaEntrevista}>
            <FiRotateCcw size={13} /> Nueva evaluación
          </button>
        </div>
      )}

      {/* ── ESTADO INICIAL (sin formulario activo) ── */}
      {!mostrarFormulario && !resultado && (
        <div className="eval-inicio">
          <div className="eval-inicio-icon-wrap">
            <FiClipboard size={28} className="eval-inicio-icon" />
          </div>
          <div className="eval-inicio-body">
            <h3>Iniciar evaluación de entrevista</h3>
            <p>
              Evalúa al candidato en {criterios.length} criterios clave
              para generar un veredicto y justificación automáticos.
            </p>
            <button className="btn-iniciar" onClick={iniciarNuevaEntrevista}>
              Iniciar evaluación
            </button>
          </div>
        </div>
      )}

      {/* ── FORMULARIO DE EVALUACIÓN ── */}
      {mostrarFormulario && (
        <div className="eval-formulario">

          {/* Barra de progreso sticky */}
          <div className="eval-progress-bar">
            <div className="eval-progress-title">
              <FiClipboard size={14} />
              <span>Evaluación en progreso</span>
            </div>
            <div className="eval-progress-stats">
              <span className="prog-badge prog-green">
                <FiCheckCircle size={12} /> {elegiblesCount} elegibles
              </span>
              <span className="prog-badge prog-red">
                <FiXCircle size={12} /> {noElegiblesCount} no elegibles
              </span>
              <span className="prog-badge prog-gray">
                {criterios.length} total
              </span>
            </div>
          </div>

          {/* Lista de criterios */}
          <div className="criterios-lista">
            {criterios.map((criterio, index) => {
              const dec = decisiones[criterio.id]?.decision;
              return (
                <div
                  key={criterio.id}
                  className={`criterio-card ${dec === 'elegible' ? 'c-elegible' : dec === 'no_elegible' ? 'c-no-elegible' : ''}`}
                >
                  <div className="criterio-header">
                    <span className="criterio-num">{index + 1}</span>
                    <div className="criterio-info">
                      <h4>{criterio.nombre}</h4>
                      <p>{criterio.descripcion}</p>
                    </div>
                    {dec && (
                      <span className={`criterio-badge ${dec === 'elegible' ? 'c-badge-ok' : 'c-badge-no'}`}>
                        {dec === 'elegible'
                          ? <><FiCheckCircle size={11} /> Elegible</>
                          : <><FiXCircle size={11} /> No elegible</>
                        }
                      </span>
                    )}
                  </div>

                  <div className="criterio-botones">
                    <button
                      className={`btn-dec btn-elegible ${dec === 'elegible' ? 'activo' : ''}`}
                      onClick={() => handleDecision(criterio.id, 'elegible')}
                    >
                      <FiCheckCircle size={14} /> Elegible
                    </button>
                    <button
                      className={`btn-dec btn-no-elegible ${dec === 'no_elegible' ? 'activo' : ''}`}
                      onClick={() => handleDecision(criterio.id, 'no_elegible')}
                    >
                      <FiXCircle size={14} /> No elegible
                    </button>
                  </div>

                  <textarea
                    className="criterio-comentario"
                    placeholder="Comentario del entrevistador (opcional)..."
                    value={decisiones[criterio.id]?.comentario || ''}
                    onChange={(e) => handleComentario(criterio.id, e.target.value)}
                    rows={2}
                  />
                </div>
              );
            })}
          </div>

          {/* Notas generales */}
          <div className="eval-notas">
            <label className="eval-notas-label">
              <FiClipboard size={13} /> Notas generales de la entrevista (opcional)
            </label>
            <textarea
              className="eval-notas-textarea"
              placeholder="Observaciones generales sobre el candidato o la entrevista..."
              value={notasGenerales}
              onChange={(e) => setNotasGenerales(e.target.value)}
              rows={3}
            />
          </div>

          {error && (
            <div className="eval-error">
              <FiAlertTriangle size={14} /> {error}
            </div>
          )}

          <div className="eval-acciones">
            <button
              className="btn-cancelar-eval"
              onClick={() => setMostrarFormulario(false)}
              disabled={enviando}
            >
              Cancelar
            </button>
            <button
              className="btn-guardar-eval"
              onClick={handleEnviar}
              disabled={enviando}
            >
              {enviando
                ? <><FiLoader className="eval-spin" size={14} /> Calculando veredicto...</>
                : <><FiSave size={14} /> Guardar evaluación</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── HISTORIAL DE EVALUACIONES ANTERIORES ── */}
      {evaluacionesAnteriores.length > 0 && (
        <div className="eval-historial">
          <h3 className="historial-titulo">
            <FiClipboard size={15} /> Historial de evaluaciones anteriores
          </h3>
          {evaluacionesAnteriores.map((ev) => (
            <div key={ev.id} className={`historial-card ${ev.veredicto === 'Apto' ? 'h-apto' : 'h-no-apto'}`}>
              <div className="historial-head">
                <div className="historial-veredicto-wrap">
                  {ev.veredicto === 'Apto'
                    ? <FiCheckCircle size={16} className="h-ico-ok" />
                    : <FiXCircle size={16} className="h-ico-no" />
                  }
                  <span className="historial-veredicto-text">{ev.veredicto}</span>
                </div>
                <div className="historial-meta">
                  <span><FiUser size={11} /> {ev.entrevistador}</span>
                  <span><FiCalendar size={11} /> {formatearFecha(ev.created_at)}</span>
                </div>
              </div>

              <div className="historial-criterios">
                {ev.criterios && ev.criterios.map((c, i) => (
                  <div key={i} className={`hc-item ${c.decision === 'elegible' ? 'hc-ok' : 'hc-no'}`}>
                    {c.decision === 'elegible'
                      ? <FiCheckCircle size={11} />
                      : <FiXCircle size={11} />
                    }
                    <span className="hc-nombre">{c.criterio}</span>
                    {c.comentario && <span className="hc-comentario">"{c.comentario}"</span>}
                  </div>
                ))}
              </div>

              <div className="historial-justificacion">
                <span className="hist-just-label">Justificación automática</span>
                <p>{ev.justificacion_automatizada}</p>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default EvaluacionTab;
