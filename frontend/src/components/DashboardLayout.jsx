import { useNavigate } from 'react-router-dom'
import './DashboardLayout.css'

export default function DashboardLayout({ children }) {
  const navigate = useNavigate()
  const usuario = (() => {
    try { return JSON.parse(localStorage.getItem('usuario') || 'null') } catch { return null }
  })()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    navigate('/login')
  }

  return (
    <div className="dashboard-root">
      <aside className="dashboard-sidebar">
        <h3>Panel</h3>
        <nav>
          <ul>
            <li>Dashboard</li>
            <li>Postulaciones</li>
            <li>Reportes</li>
          </ul>
        </nav>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-header">
          <div className="dashboard-search">Buscar...</div>
          <div className="dashboard-user">
            <span>{usuario?.nombre || 'Usuario'}</span>
            <button onClick={handleLogout}>Salir</button>
          </div>
        </header>
        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  )
}
