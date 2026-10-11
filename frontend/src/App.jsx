// ============================================================
// PUNTO DE ENTRADA PRINCIPAL (App.jsx)
// Sistema SICS - Hotel Margarita Village
//
// Define la jerarquía global de enrutamiento mediante React Router.
// Configura las rutas públicas (Portal de postulantes, inicio de sesión)
// y las rutas privadas (Panel de reclutamiento y expediente de candidatos),
// envolviendo la aplicación en el proveedor global AuthProvider.
// ============================================================

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import RutaProtegida from './components/RutaProtegida'
import DashboardLayout from './components/DashboardLayout'

// Páginas Públicas (Accesibles por candidatos y visitantes)
import LandingPage from './pages/LandingPage'
import PostularPage from './pages/PostularPage'

// Páginas Privadas (Acceso exclusivo para reclutadores autenticados)
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ExpedientePage from './pages/ExpedientePage'
import CandidatosPage from './pages/CandidatosPage'

// Módulo Sprint 7: Banco de preguntas técnicas para exámenes de candidatos
import ExamenesPage from './pages/ExamenesPage'

// Módulo Sprint 8: Evaluación pública de candidatos
import ExamenCandidatoPage from './pages/ExamenCandidatoPage'

// Módulo Sprint 9: Reportes Ejecutivos & Analítica de Selección
import ReportesPage from './pages/ReportesPage'

import './index.css'
import './App.css'

function App() {
  return (
    // Envuelve todo el árbol de componentes en AuthProvider para exponer el estado de sesión
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ---------------- RUTAS PÚBLICAS ---------------- */}
          {/* Página de inicio institucional del hotel */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Portal dinámico de postulación para aspirantes */}
          <Route path="/postular" element={<PostularPage />} />
          
          {/* Pantalla de inicio de sesión para el personal de Selección */}
          <Route path="/login" element={<LoginPage />} />

          {/* Portal de Evaluación del Candidato (Sprint 8) */}
          <Route path="/evaluacion/:token" element={<ExamenCandidatoPage />} />

          {/* ---------------- RUTAS PRIVADAS ---------------- */}
          {/* 
            El componente <RutaProtegida /> actúa como un filtro de seguridad.
            Si no hay un token válido en sesión, redirige hacia /login.
          */}
          <Route element={<RutaProtegida />}>
            
            {/* 
              DashboardLayout suministra la barra lateral (Sidebar) y la cabecera (Header).
              Todas las rutas anidadas en su interior se renderizan dentro de su <Outlet />.
            */}
            <Route element={<DashboardLayout />}>
              {/* Vista del panel principal con métricas y postulaciones recientes */}
              <Route path="/dashboard" element={<DashboardPage />} />
              
              {/* Vista del perfil 360° y expediente digital de un candidato */}
              <Route path="/dashboard/expediente/:cedula" element={<ExpedientePage />} />

              {/* Vista del catálogo maestro de candidatos con paginación y filtros */}
              <Route path="/dashboard/candidatos" element={<CandidatosPage />} />

              {/* Vista del banco de preguntas técnicas — Sprint 7 */}
              <Route path="/dashboard/examenes" element={<ExamenesPage />} />

              {/* Módulo de Reportes Ejecutivos y Analítica — Sprint 9 */}
              <Route path="/dashboard/reportes" element={<ReportesPage />} />
            </Route>
            
          </Route>

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App

