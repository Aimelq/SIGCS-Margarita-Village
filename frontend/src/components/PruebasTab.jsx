import React, { useState, useEffect } from 'react';
import { FiFileText, FiLink, FiCheckCircle, FiClock, FiPlus } from 'react-icons/fi';
import api from '../api/axios';
import './PruebasTab.css';

const PruebasTab = ({ cedula }) => {
  const [examenes, setExamenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);

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
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PruebasTab;
