// ============================================================
// PÁGINA INSTITUCIONAL DE BIENVENIDA (LandingPage.jsx)
// Sistema SICS - Hotel Margarita Village
//
// Es la vista principal pública del portal. Presenta la propuesta de valor
// del hotel, los beneficios de laborar en la institución y proporciona
// los botones de llamada a la acción (CTA) para iniciar el proceso de postulación.
// ============================================================

import { useNavigate } from 'react-router-dom'
import { FaRegBuilding, FaChartLine, FaUsers, FaShieldAlt, FaMapMarkedAlt, FaBalanceScale } from 'react-icons/fa'
import './LandingPage.css?v=2'

function LandingPage() {
  // Hook de navegación reactiva para redirigir al portal de postulación (/postular)
  const navigate = useNavigate()

  // Desplazamiento suave hacia la sección informativa de beneficios
  const scrollABeneficios = () => {
    document.getElementById('beneficios').scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="landing">

      {/* Cabecera de navegación superior (Navbar) */}
      <nav className="navbar">
        <div className="navbar-inner">
          <img
            src="/Margarita-Village-logo.png"
            alt="Isotipo del Hotel Margarita Village"
            className="navbar-logo"
          />
          <div className="navbar-links">
            <a href="#beneficios">Nosotros</a>
            <a href="#footer">Contacto</a>
          </div>
          <button
            className="btn-primary"
            id="btn-postularme-nav"
            onClick={() => navigate('/postular')}
          >
            Postularme
          </button>
        </div>
      </nav>

      {/* Sección principal de llamada a la acción (Hero Banner) */}
      <section className="hero" id="inicio">
        <div className="hero-particles">
          <span></span><span></span><span></span>
        </div>

        <div className="hero-content fade-in-up">
          <div className="hero-badge">
            <span className="badge badge-warning">Oportunidades disponibles</span>
          </div>

          <h1 className="hero-titulo">
            Sé parte del equipo<br />
            <span className="titulo-dorado">Margarita Village</span>
          </h1>

          <p className="hero-subtitulo">
            Únete a la familia hotelera más reconocida de Nueva Esparta.
            Aquí tu talento tiene un lugar.
          </p>

          <div className="hero-acciones">
            <button
              className="btn-primary btn-grande"
              id="btn-postularme-hero"
              onClick={() => navigate('/postular')}
            >
              Registrar mi postulación
            </button>
            <button
              className="btn-secondary btn-grande"
              id="btn-conocer-mas"
              onClick={scrollABeneficios}
            >
              Conocer más
            </button>
          </div>

          {/* Ficha de estadísticas representativas */}
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-numero">+200</span>
              <span className="stat-label">Colaboradores</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat">
              <span className="stat-numero">15+</span>
              <span className="stat-label">Años de experiencia</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat">
              <span className="stat-numero">100%</span>
              <span className="stat-label">Compromiso</span>
            </div>
          </div>
        </div>

        {/* Indicador visual de desplazamiento hacia abajo */}
        <div className="scroll-indicator" onClick={scrollABeneficios}>
          <div className="scroll-dot"></div>
        </div>
      </section>

      {/* Sección informativa de pilares y beneficios laborales */}
      <section className="beneficios" id="beneficios">
        <div className="seccion-inner">
          <div className="seccion-header">
            <span className="seccion-etiqueta">Por qué elegirnos</span>
            <h2>Trabaja en un ambiente<br />de clase mundial</h2>
            <div className="gold-line" style={{ margin: '16px auto 0' }}></div>
          </div>

          <div className="cards-beneficios">
            <div className="card-beneficio">
              <div className="card-icono"><FaRegBuilding /></div>
              <h3>Ambiente Profesional</h3>
              <p>Trabajarás en instalaciones de primer nivel, rodeado de un equipo comprometido con la excelencia.</p>
            </div>

            <div className="card-beneficio card-destacada">
              <div className="card-icono"><FaChartLine /></div>
              <h3>Crecimiento Real</h3>
              <p>Ofrecemos planes de desarrollo profesional, capacitaciones y oportunidades de ascenso interno.</p>
            </div>

            <div className="card-beneficio">
              <div className="card-icono"><FaUsers /></div>
              <h3>Equipo Unido</h3>
              <p>Formarás parte de una familia de más de 200 colaboradores comprometidos con el buen servicio.</p>
            </div>

            <div className="card-beneficio">
              <div className="card-icono"><FaShieldAlt /></div>
              <h3>Estabilidad Laboral</h3>
              <p>Brindamos contratos formales, beneficios de ley y un ambiente de trabajo seguro y respetuoso.</p>
            </div>

            <div className="card-beneficio">
              <div className="card-icono"><FaMapMarkedAlt /></div>
              <h3>Mejor Destino</h3>
              <p>Trabaja en uno de los destinos turísticos más importantes de Venezuela, en Porlamar, Nueva Esparta.</p>
            </div>

            <div className="card-beneficio">
              <div className="card-icono"><FaBalanceScale /></div>
              <h3>Proceso Justo</h3>
              <p>Nuestro proceso de selección es transparente, basado en criterios objetivos y sin favoritismos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sección de Galería (Nuestras Instalaciones) */}
      <section className="galeria-instalaciones">
        <div className="seccion-inner">
          <div className="seccion-header">
            <span className="seccion-etiqueta">Nuestras Instalaciones</span>
            <h2>Forma parte de la experiencia<br />Margarita Village</h2>
            <div className="gold-line" style={{ margin: '16px auto 0' }}></div>
          </div>
          
          <div className="bento-grid">
            <div className="bento-item grande">
              <img src="/MV-FOTO4.jpg" alt="Vista aérea de la piscina" />
            </div>
            <div className="bento-item">
              <img src="/MV-FOTO.jpg" alt="Piscina y palmeras" />
            </div>
            <div className="bento-item">
              <img src="/MV-FOTO3.jpg" alt="Restaurante" />
            </div>
            <div className="bento-item horizontal">
              <img src="/MV-FOTO2.jpg" alt="Churuata principal" />
            </div>
            <div className="bento-item">
              <img src="/MV-FOTO1.jpg" alt="Piscinas" />
            </div>
          </div>
        </div>
      </section>

      {/* Sección de cierre y llamada a la acción secundario */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2>¿Listo para dar el siguiente paso?</h2>
          <p>Registra tu postulación ahora. El proceso es rápido y accesible desde cualquier dispositivo.</p>
          <button
            className="btn-primary btn-grande"
            id="btn-postularme-cta"
            onClick={() => navigate('/postular')}
          >
            Comenzar mi postulación →
          </button>
        </div>
      </section>

      {/* Pie de página institucional (Footer) */}
      <footer className="footer" id="footer">
        <div className="footer-inner">
          <div className="footer-logo">
            <img src="/Margarita-Village-logo.png" alt="Logo Hotel Margarita Village" height="60" />
          </div>
          <div className="footer-info">
            <p>Hotel Margarita Village Hotel & Resort</p>
            <p>Porlamar, Estado Nueva Esparta, Venezuela</p>
          </div>
          <div className="footer-copy">
            <p>© 2026 Hotel Margarita Village. Todos los derechos reservados.</p>
            {/* Eliminado texto de tesis */}
          </div>
        </div>
      </footer>

    </div>
  )
}

export default LandingPage

