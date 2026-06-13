import { useNavigate } from 'react-router-dom'
import { FaRegBuilding, FaChartLine, FaUsers, FaShieldAlt, FaMapMarkedAlt, FaBalanceScale } from 'react-icons/fa'
import './LandingPage.css?v=2'

// LandingPage es la pagina publica de presentacion del hotel.
// Tiene 4 secciones: Navbar, Hero, Beneficios y Footer.
// El aspirante llega aqui primero y desde aqui va al formulario.
function LandingPage() {
  const navigate = useNavigate()

  // Funcion para hacer scroll suave a la seccion de beneficios
  const scrollABeneficios = () => {
    document.getElementById('beneficios').scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="landing">

      {/* ---- NAVBAR ---- */}
      <nav className="navbar">
        <div className="navbar-inner">
          <img
            src="/Margarita-Village-logo.png"
            alt="Hotel Margarita Village"
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

      {/* ---- HERO ---- */}
      <section className="hero" id="inicio">
        {/* Particulas decorativas de fondo */}
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

          {/* Estadisticas decorativas */}
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

        {/* Indicador de scroll */}
        <div className="scroll-indicator" onClick={scrollABeneficios}>
          <div className="scroll-dot"></div>
        </div>
      </section>

      {/* ---- SECCION BENEFICIOS ---- */}
      <section className="beneficios" id="beneficios">
        <div className="seccion-inner">
          <div className="seccion-header">
            <span className="seccion-etiqueta">Por que elegirnos</span>
            <h2>Trabaja en un ambiente<br />de clase mundial</h2>
            <div className="gold-line" style={{ margin: '16px auto 0' }}></div>
          </div>

          <div className="cards-beneficios">
            <div className="card-beneficio">
              <div className="card-icono"><FaRegBuilding /></div>
              <h3>Ambiente Profesional</h3>
              <p>Trabajaras en instalaciones de primer nivel, rodeada de un equipo comprometido con la excelencia.</p>
            </div>

            <div className="card-beneficio card-destacada">
              <div className="card-icono"><FaChartLine /></div>
              <h3>Crecimiento Real</h3>
              <p>Ofrecemos planes de desarrollo profesional, capacitaciones y oportunidades de ascenso interno.</p>
            </div>

            <div className="card-beneficio">
              <div className="card-icono"><FaUsers /></div>
              <h3>Equipo Unido</h3>
              <p>Formaras parte de una familia de mas de 200 colaboradores comprometidos con el buen servicio.</p>
            </div>

            <div className="card-beneficio">
              <div className="card-icono"><FaShieldAlt /></div>
              <h3>Estabilidad Laboral</h3>
              <p>Brindamos contratos formales, beneficios de ley y un ambiente de trabajo seguro y respetuoso.</p>
            </div>

            <div className="card-beneficio">
              <div className="card-icono"><FaMapMarkedAlt /></div>
              <h3>Mejor Destino</h3>
              <p>Trabaja en uno de los destinos turisticos mas importantes de Venezuela, en Porlamar, Nueva Esparta.</p>
            </div>

            <div className="card-beneficio">
              <div className="card-icono"><FaBalanceScale /></div>
              <h3>Proceso Justo</h3>
              <p>Nuestro proceso de seleccion es transparente, basado en criterios objetivos y sin favoritismos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- CTA CENTRAL ---- */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2>Listo para dar el siguiente paso?</h2>
          <p>Registra tu postulacion ahora. El proceso es rapido, desde cualquier dispositivo.</p>
          <button
            className="btn-primary btn-grande"
            id="btn-postularme-cta"
            onClick={() => navigate('/postular')}
          >
            Comenzar mi postulacion →
          </button>
        </div>
      </section>

      {/* ---- FOOTER ---- */}
      <footer className="footer" id="footer">
        <div className="footer-inner">
          <div className="footer-logo">
            <img src="/Margarita-Village-logo.png" alt="Margarita Village" height="60" />
          </div>
          <div className="footer-info">
            <p>Hotel Margarita Village Hotel & Resort</p>
            <p>Porlamar, Estado Nueva Esparta, Venezuela</p>
          </div>
          <div className="footer-copy">
            <p>© 2026 Hotel Margarita Village. Todos los derechos reservados.</p>
            <p>Sistema SIGCS — Desarrollado como Trabajo de Grado, UDO Nueva Esparta.</p>
          </div>
        </div>
      </footer>

    </div>
  )
}

export default LandingPage
