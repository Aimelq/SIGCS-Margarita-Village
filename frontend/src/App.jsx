import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import RutaProtegida from './components/RutaProtegida'
import DashboardLayout from './components/DashboardLayout'

// Páginas Públicas
import LandingPage from './pages/LandingPage'
import PostularPage from './pages/PostularPage'

// Páginas Privadas (Panel Interno)
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ExpedientePage from './pages/ExpedientePage'

import './index.css'
import './App.css'

// App es el punto de entrada de toda la aplicacion.
// Envolvemos todo en <AuthProvider> para que cualquier componente
// pueda saber si hay un usuario logueado o no.
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ================= RUTAS PÚBLICAS ================= */}
          {/* La página de inicio del hotel */}
          <Route path="/" element={<LandingPage />} />
          
          {/* El formulario donde el aspirante se postula */}
          <Route path="/postular" element={<PostularPage />} />
          
          {/* La página para que el reclutador inicie sesión */}
          <Route path="/login" element={<LoginPage />} />

          {/* ================= RUTAS PRIVADAS ================= */}
          {/* 
            RutaProtegida verifica si hay un token válido.
            Si no lo hay, patea al usuario a /login.
            Si lo hay, permite acceder a las rutas que están dentro (hijas).
          */}
          <Route element={<RutaProtegida />}>
            
            {/* 
              DashboardLayout envuelve a todas las páginas internas, 
              proveyendo el Sidebar izquierdo y el Header superior. 
            */}
            <Route element={<DashboardLayout />}>
              {/* Página principal con las métricas y tabla de recientes */}
              <Route path="/dashboard" element={<DashboardPage />} />
              
              {/* Página del perfil detallado de un candidato específico */}
              <Route path="/dashboard/expediente/:cedula" element={<ExpedientePage />} />
              
              {/* Estas rutas quedarían para los próximos sprints */}
              {/* <Route path="/dashboard/candidatos" element={<ListaCandidatosPage />} /> */}
              {/* <Route path="/dashboard/evaluaciones" element={<EvaluacionesPage />} /> */}
            </Route>
            
          </Route>

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
