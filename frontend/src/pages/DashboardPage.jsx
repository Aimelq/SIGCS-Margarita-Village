import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUserPlus, FiUsers, FiEye, FiCheckCircle, FiSearch } from 'react-icons/fi';
import api from '../api/axios';
import './DashboardPage.css';

const DashboardPage = () => {
  const navigate = useNavigate();
  
  // ================= ESTADOS =================
  const [metricas, setMetricas] = useState(null);
  const [recientes, setRecientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  // Estados para el buscador
  const [busqueda, setBusqueda] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [buscando, setBuscando] = useState(false);

  // ================= EFECTOS =================
  // useEffect para cargar los datos del dashboard apenas se renderiza el componente
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Promise.all permite hacer 2 peticiones a la API al mismo tiempo en paralelo
        // Esto es mucho más rápido que hacer una y luego la otra
        const [resMetricas, resRecientes] = await Promise.all([
          api.get('/api/dashboard/metricas'),
          api.get('/api/dashboard/recientes')
        ]);
        
        setMetricas(resMetricas.data);
        setRecientes(resRecientes.data);
      } catch (error) {
        console.error("Error cargando el dashboard", error);
      } finally {
        setCargando(false);
      }
    };
    
    cargarDatos();
  }, []);

  // Efecto para el buscador en tiempo real (Debounce)
  useEffect(() => {
    // Si la búsqueda está vacía, borro los resultados
    if (!busqueda.trim()) {
      setResultadosBusqueda([]);
      return;
    }

    // Debounce: espera 300 milisegundos después de que el usuario deja de escribir 
    // antes de hacer la petición al backend. Esto evita sobrecargar el servidor
    // haciendo una petición por cada letra que presiona.
    const delayDebounce = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await api.get(`/api/candidatos?q=${busqueda}`);
        setResultadosBusqueda(res.data);
      } catch (error) {
        console.error("Error buscando candidatos", error);
      } finally {
        setBuscando(false);
      }
    }, 300);

    // Si el usuario escribe antes de los 300ms, limpio el temporizador viejo
    return () => clearTimeout(delayDebounce);
  }, [busqueda]);

  // ================= FUNCIONES =================
  
  // Esta función asigna una clase CSS dependiendo del estado del aspirante
  // para pintar el "badge" (la etiquetita de color) en la tabla
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

  // ================= RENDERIZADO =================
  if (cargando) return <div className="cargando-dashboard">Cargando métricas...</div>;

  return (
    <div className="dashboard-page">
      
      {/* 1. BUSCADOR SUPERIOR */}
      <div className="search-section">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Buscar candidato por cédula, nombre o apellido..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        
        {/* Dropdown de resultados. Solo se muestra si hay texto en el input */}
        {busqueda && (
          <div className="search-results">
            {buscando ? (
              <div className="search-item">Buscando...</div>
            ) : resultadosBusqueda.length > 0 ? (
              resultadosBusqueda.map((candidato, index) => (
                <div 
                  key={index} 
                  className="search-item"
                  // Al hacer clic, redirijo al perfil completo de ese candidato
                  onClick={() => navigate(`/dashboard/expediente/${candidato.cedula}`)}
                >
                  <div className="candidato-info">
                    <strong>{candidato.nombre} {candidato.apellido}</strong>
                    <span>CI: {candidato.cedula}</span>
                  </div>
                  <span className={`badge ${getBadgeClass(candidato.estado_actual)}`}>
                    {candidato.estado_actual}
                  </span>
                </div>
              ))
            ) : (
              <div className="search-item">No se encontraron resultados</div>
            )}
          </div>
        )}
      </div>

      {/* 2. CARDS DE MÉTRICAS */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon bg-blue-100">
            <FiUserPlus className="text-blue-600" />
          </div>
          <div className="metric-info">
            <h3>Postulados Semana</h3>
            <p className="metric-value">{metricas?.postulados_semana || 0}</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon bg-orange-100">
            <FiUsers className="text-orange-600" />
          </div>
          <div className="metric-info">
            <h3>Total Aspirantes</h3>
            <p className="metric-value">{metricas?.total_aspirantes || 0}</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon bg-yellow-100">
            <FiEye className="text-yellow-600" />
          </div>
          <div className="metric-info">
            <h3>En Revisión</h3>
            <p className="metric-value">{metricas?.en_revision || 0}</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon bg-green-100">
            <FiCheckCircle className="text-green-600" />
          </div>
          <div className="metric-info">
            <h3>Seleccionados (Aptos)</h3>
            <p className="metric-value">{metricas?.aptos || 0}</p>
          </div>
        </div>
      </div>

      {/* 3. TABLA DE REGISTROS RECIENTES */}
      <div className="recent-section">
        <div className="section-header">
          <h2>Postulaciones Recientes</h2>
          <button className="btn-secondary" onClick={() => navigate('/dashboard/candidatos')}>
            Ver todos
          </button>
        </div>
        
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cédula</th>
                <th>Aspirante</th>
                <th>Cargo Solicitado</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {recientes.map((fila, i) => (
                <tr key={i}>
                  <td>{fila.cedula}</td>
                  <td><strong>{fila.nombre} {fila.apellido}</strong></td>
                  <td>{fila.empleo_solicitado || 'No especificado'}</td>
                  <td>
                    <span className={`badge ${getBadgeClass(fila.estado_actual)}`}>
                      {fila.estado_actual}
                    </span>
                  </td>
                  <td>{fila.created_at}</td>
                  <td>
                    <button 
                      className="btn-action"
                      onClick={() => navigate(`/dashboard/expediente/${fila.cedula}`)}
                    >
                      Ver perfil
                    </button>
                  </td>
                </tr>
              ))}
              {recientes.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center">No hay registros recientes</td>
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
