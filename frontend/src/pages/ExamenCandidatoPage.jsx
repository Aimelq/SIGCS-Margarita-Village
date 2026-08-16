import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './ExamenCandidatoPage.css';
import { FiCheckCircle, FiLoader } from 'react-icons/fi';

const ExamenCandidatoPage = () => {
  const { token } = useParams();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [examen, setExamen] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [finalizado, setFinalizado] = useState(false);

  useEffect(() => {
    cargarExamen();
  }, [token]);

  const cargarExamen = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/evaluacion/${token}`);
      setExamen(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar el examen. Es posible que el enlace no sea válido o haya expirado.');
    } finally {
      setCargando(false);
    }
  };

  const handleOptionChange = (preguntaId, opcion) => {
    setRespuestas(prev => ({
      ...prev,
      [preguntaId]: opcion
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(respuestas).length < examen.preguntas.length) {
      alert('Por favor, responde todas las preguntas antes de enviar el examen.');
      return;
    }

    if (!window.confirm('¿Estás seguro de enviar tus respuestas? No podrás modificarlas después.')) {
      return;
    }

    setEnviando(true);
    try {
      const payload = {
        respuestas: Object.keys(respuestas).map(ep_id => ({
          examen_pregunta_id: parseInt(ep_id, 10),
          respuesta: respuestas[ep_id]
        }))
      };

      await axios.post(`http://localhost:5000/api/evaluacion/${token}`, payload);
      setFinalizado(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al enviar las respuestas');
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <div className="examen-public-loader">
        <FiLoader className="spin-icon" size={32} />
        <p>Cargando evaluación...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="examen-public-error">
        <h2>Lo sentimos</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (finalizado) {
    return (
      <div className="examen-public-success">
        <FiCheckCircle size={64} className="success-icon" />
        <h2>¡Evaluación Completada!</h2>
        <p>Tus respuestas han sido enviadas exitosamente al equipo de Recursos Humanos del Hotel Margarita Village.</p>
        <p>Puedes cerrar esta ventana.</p>
      </div>
    );
  }

  return (
    <div className="examen-public-container">
      <div className="examen-public-header">
        <h1>Evaluación Psicotécnica</h1>
        <p>Candidato: <strong>{examen.candidato}</strong></p>
        <p className="instrucciones">
          Por favor, lee cuidadosamente cada pregunta y selecciona la respuesta que consideres más adecuada. 
          Al finalizar, haz clic en el botón "Enviar respuestas" al final de la página.
        </p>
      </div>

      <form className="examen-public-form" onSubmit={handleSubmit}>
        {examen.preguntas.map((p, index) => (
          <div key={p.examen_pregunta_id} className="pregunta-card">
            <h3>{index + 1}. {p.texto}</h3>
            
            {(p.tipo === 'Opción múltiple' || p.tipo === 'Verdadero/Falso') ? (
              <div className="opciones-lista">
                {p.opciones.map((op, i) => (
                  <label key={i} className="opcion-label">
                    <input
                      type="radio"
                      name={`pregunta_${p.examen_pregunta_id}`}
                      value={op}
                      checked={respuestas[p.examen_pregunta_id] === op}
                      onChange={() => handleOptionChange(p.examen_pregunta_id, op)}
                    />
                    {op}
                  </label>
                ))}
              </div>
            ) : (
              <div className="opciones-lista">
                <textarea
                  className="respuesta-abierta"
                  rows={4}
                  placeholder="Escribe tu respuesta aquí..."
                  value={respuestas[p.examen_pregunta_id] || ''}
                  onChange={(e) => handleOptionChange(p.examen_pregunta_id, e.target.value)}
                />
              </div>
            )}
          </div>
        ))}

        <div className="examen-public-footer">
          <button type="submit" className="btn-enviar-examen" disabled={enviando}>
            {enviando ? 'Enviando...' : 'Enviar respuestas'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExamenCandidatoPage;
