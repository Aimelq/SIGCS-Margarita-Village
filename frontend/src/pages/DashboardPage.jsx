import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import DashboardLayout from '../components/DashboardLayout'
import './DashboardPage.css'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [metricas, setMetricas] = useState(null)
  const [recientes, setRecientes] = useState([])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return navigate('/login')

    const cargar = async () => {
      try {
        const m = await api.get('/api/dashboard/metricas')
        setMetricas(m.data)
        const r = await api.get('/api/dashboard/recientes')
        setRecientes(r.data)
      } catch (e) {
        console.error(e)
      }
    }
    cargar()
  }, [navigate])

  return (
    <DashboardLayout>
      <h2>Dashboard</h2>
      <section className="cards">
        <div className="card">
          <strong>{metricas?.postulados_semana ?? '-'}</strong>
          <div>Postulados (últimos 7 días)</div>
        </div>
        <div className="card">
          <strong>{metricas?.total_aspirantes ?? '-'}</strong>
          <div>Total sistema</div>
        </div>
        <div className="card">
          <strong>{metricas?.en_revision ?? '-'}</strong>
          <div>Entrevistas / En revisión</div>
        </div>
        <div className="card">
          <strong>{metricas?.aptos ?? '-'}</strong>
          <div>Aptos</div>
        </div>
      </section>

      <section className="recientes">
        <h3>Registros recientes</h3>
        <table>
          <thead>
            <tr><th>Cédula</th><th>Nombre</th><th>Empleo</th><th>Estado</th><th>Fecha</th></tr>
          </thead>
          <tbody>
            {recientes.map((r, idx) => (
              <tr key={idx}>
                <td>{r.cedula}</td>
                <td>{r.nombre} {r.apellido}</td>
                <td>{r.empleo_solicitado || '-'}</td>
                <td><span className={`badge ${r.estado_actual?.toLowerCase().replace(/\s+/g,'-')}`}>{r.estado_actual}</span></td>
                <td>{r.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </DashboardLayout>
  )
}
