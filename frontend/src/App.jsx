import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import PostularPage from './pages/PostularPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import './index.css'
import './App.css'

// App es el punto de entrada de toda la aplicacion.
// Aqui configuro las rutas principales:
// / -> Landing Page publica del hotel
// /postular -> Formulario de postulacion para el aspirante
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/postular" element={<PostularPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
