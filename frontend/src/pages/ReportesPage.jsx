// ============================================================
// MÓDULO DE REPORTES & ANALÍTICA (ReportesPage.jsx)
// Sistema SICS - Hotel Margarita Village
//
// Panel avanzado de inteligencia de selección con:
//   - KPIs ejecutivos (tasa de conversión, tiempo promedio, eficiencia de pruebas)
//   - Embudo de reclutamiento (Recruitment Funnel)
//   - Top 8 cargos más solicitados
//   - Distribución académica de candidatos
//   - Evolución mensual de postulaciones
//   - Disponibilidad horaria (rotativos/fines de semana)
//   - Rendimiento en evaluaciones psicotécnicas
//   - Exportación del informe ejecutivo en PDF
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
  FiBarChart2, FiTrendingUp, FiUsers, FiCheckCircle,
  FiClock, FiFileText, FiDownload, FiLoader, FiActivity,
  FiAward, FiRotateCcw, FiCalendar
} from 'react-icons/fi';
import api from '../api/axios';
import './ReportesPage.css';

// Paleta de colores categórica para gráficos de formación
const PALETTE = [
  '#3b82f6', '#f97316', '#22c55e', '#eab308',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'
];

// Etiquetas amigables de cada período
const PERIODOS = [
  { key: 'todo',  label: 'Todo el historial' },
  { key: '365d', label: 'Último año' },
  { key: '90d',  label: 'Trimestre' },
  { key: '30d',  label: 'Mes reciente' },
];

const ReportesPage = () => {
  const [periodo, setPeriodo] = useState('todo');
  const [analitica, setAnalitica] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [descargando, setDescargando] = useState(false);

  // Carga analítica cuando cambia el período
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await api.get(`/api/dashboard/analitica?periodo=${periodo}`);
      setAnalitica(res.data);
    } catch (err) {
      console.error('Error cargando analítica:', err);
    } finally {
      setCargando(false);
    }
  }, [periodo]);

  useEffect(() => { cargar(); }, [cargar]);

  // Descarga el informe ejecutivo en PDF
  const handleDescargarPDF = async () => {
    setDescargando(true);
    try {
      const response = await api.get(`/api/dashboard/reporte-pdf?periodo=${periodo}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: 'application/pdf' })
      );
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Informe_KPIs_${periodo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('No se pudo generar el informe PDF.');
      console.error(err);
    } finally {
      setDescargando(false);
    }
  };

  // Calcula la altura proporcional de las barras de evolución mensual
  const calcularAlturaEvol = (cantidad, max) => {
    if (!max || max === 0) return 4;
    return Math.max(4, Math.round((cantidad / max) * 88));
  };

  if (cargando) {
    return (
      <div className="rep-loading">
        <FiLoader className="rep-spin" size={28} />
        <p>Calculando métricas de selección...</p>
      </div>
    );
  }

  if (!analitica) {
    return (
      <div className="rep-loading">
        <p>No se pudieron cargar los datos. Por favor intente nuevamente.</p>
      </div>
    );
  }

  const { kpis, embudo, distribucion_cargos, distribucion_formacion,
          disponibilidad, rendimiento_pruebas, evolucion_mensual } = analitica;

  const maxEvol = Math.max(...(evolucion_mensual?.map(e => e.cantidad) || [1]), 1);
  const maxCargo = Math.max(...(distribucion_cargos?.map(c => c.total) || [1]), 1);

  // Configuración de las 8 tarjetas KPI
  const KPI_CARDS = [
    {
      icon: <FiUsers size={18} />,
      label: 'Total Candidatos',
      value: kpis.total_aspirantes,
      sub: 'Registros en el sistema',
      color: '#3b82f6',
      bg: '#eff6ff'
    },
    {
      icon: <FiCheckCircle size={18} />,
      label: 'Tasa de Conversión',
      value: `${kpis.tasa_conversion}%`,
      sub: `${kpis.seleccionados} seleccionados`,
      color: '#22c55e',
      bg: '#f0fdf4'
    },
    {
      icon: <FiClock size={18} />,
      label: 'Eficiencia Pruebas',
      value: `${kpis.tasa_aprobacion_pruebas}%`,
      sub: 'Tasa de aprobación',
      color: '#eab308',
      bg: '#fefce8'
    },
    {
      icon: <FiAward size={18} />,
      label: 'Puntaje Promedio',
      value: kpis.promedio_examen,
      sub: 'Evaluaciones técnicas /20',
      color: '#8b5cf6',
      bg: '#f5f3ff'
    },
    {
      icon: <FiTrendingUp size={18} />,
      label: 'Descartados',
      value: kpis.descartados,
      sub: 'Candidatos rechazados',
      color: '#ef4444',
      bg: '#fef2f2'
    },
    {
      icon: <FiRotateCcw size={18} />,
      label: 'Disp. Rotativa',
      value: `${kpis.rotativo_porcentaje}%`,
      sub: 'Turno rotativo',
      color: '#f97316',
      bg: '#fff7ed'
    },
    {
      icon: <FiCalendar size={18} />,
      label: 'Disp. Fines',
      value: `${kpis.fines_porcentaje}%`,
      sub: 'Fines de semana',
      color: '#14b8a6',
      bg: '#f0fdfa'
    },
    {
      icon: <FiActivity size={18} />,
      label: 'Exámenes Emitidos',
      value: rendimiento_pruebas.total_examenes,
      sub: `${rendimiento_pruebas.finalizados} finalizados`,
      color: '#06b6d4',
      bg: '#ecfeff'
    },
  ];

  return (
    <div className="reportes-page">

      {/* ── CABECERA ── */}
      <div className="rep-header">
        <div>
          <h1 className="rep-titulo">Reportes & Analítica de Selección</h1>
          <p className="rep-subtitulo">
            Inteligencia ejecutiva del proceso de captación de talento del Hotel Margarita Village
          </p>
        </div>
        <div className="rep-header-actions">
          {/* Selector de período temporal */}
          <div className="rep-periodo-tabs">
            {PERIODOS.map(p => (
              <button
                key={p.key}
                className={`rep-tab ${periodo === p.key ? 'active' : ''}`}
                onClick={() => setPeriodo(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Descarga del informe PDF */}
          <button
            className="btn-rep-pdf"
            onClick={handleDescargarPDF}
            disabled={descargando}
            id="btn-descargar-reporte-pdf"
          >
            {descargando
              ? <FiLoader className="rep-spin" size={14} />
              : <FiDownload size={14} />
            }
            {descargando ? 'Generando...' : 'Informe PDF'}
          </button>
        </div>
      </div>

      {/* ── GRID DE KPIS EJECUTIVOS ── */}
      <div className="rep-kpi-grid">
        {KPI_CARDS.map((card, i) => (
          <div
            className="rep-kpi-card"
            key={i}
            style={{ '--kpi-color': card.color, '--kpi-bg': card.bg }}
          >
            <div className="rep-kpi-icon">{card.icon}</div>
            <div className="rep-kpi-info">
              <span className="rep-kpi-label">{card.label}</span>
              <span className="rep-kpi-value">{card.value}</span>
              <span className="rep-kpi-sub">{card.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── FILA 2: EMBUDO + CARGOS ── */}
      <div className="rep-grid-2">

        {/* EMBUDO DE CONVERSIÓN */}
        <div className="rep-card">
          <div className="rep-card-header">
            <h3 className="rep-card-title">
              <FiTrendingUp size={15} /> Embudo de Reclutamiento (Conversion Funnel)
            </h3>
          </div>
          <div className="rep-funnel">
            {embudo.map((etapa, i) => (
              <div className="rep-funnel-step" key={i}>
                <div className="rep-funnel-meta">
                  <span className="rep-funnel-label">{etapa.etapa}</span>
                  <span style={{ color: etapa.color || '#3b82f6', fontWeight: 700, fontSize: 12 }}>
                    {etapa.cantidad} cand. ({etapa.porcentaje_total}%)
                  </span>
                </div>
                <div className="rep-funnel-bar-wrap">
                  <div
                    className="rep-funnel-bar"
                    style={{
                      width: `${etapa.porcentaje_total}%`,
                      background: etapa.color || '#3b82f6'
                    }}
                  />
                </div>
                {i < embudo.length - 1 && (
                  <span style={{ fontSize: 10.5, color: 'var(--texto-mut)' }}>
                    Retención hacia siguiente etapa: <strong>{etapa.retencion}%</strong>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* TOP CARGOS MÁS SOLICITADOS */}
        <div className="rep-card">
          <div className="rep-card-header">
            <h3 className="rep-card-title">
              <FiBarChart2 size={15} /> Top Cargos más Solicitados
            </h3>
            <span style={{ fontSize: 11, color: 'var(--texto-mut)' }}>
              {distribucion_cargos.length} posiciones distintas
            </span>
          </div>
          <div>
            {distribucion_cargos.map((cargo, i) => (
              <div className="rep-cargo-row" key={i}>
                <span className="rep-cargo-rank">#{i + 1}</span>
                <div className="rep-cargo-info">
                  <div className="rep-cargo-name">{cargo.cargo}</div>
                  <div className="rep-cargo-bar-wrap">
                    <div
                      className="rep-cargo-bar"
                      style={{ width: `${(cargo.total / maxCargo) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="rep-cargo-count">{cargo.total}</span>
                <span className="rep-cargo-pct">{cargo.porcentaje}%</span>
              </div>
            ))}
            {distribucion_cargos.length === 0 && (
              <p style={{ color: 'var(--texto-mut)', fontSize: 13, margin: 0 }}>
                Sin datos de postulación disponibles.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── FILA 3: EVOLUCIÓN MENSUAL + FORMACIÓN + PRUEBAS ── */}
      <div className="rep-grid-2">

        {/* EVOLUCIÓN MENSUAL DE POSTULACIONES */}
        <div className="rep-card">
          <div className="rep-card-header">
            <h3 className="rep-card-title">
              <FiCalendar size={15} /> Evolución Mensual de Postulaciones
            </h3>
          </div>
          {evolucion_mensual.length > 0 ? (
            <div className="rep-evol-chart">
              {evolucion_mensual.map((mes, i) => (
                <div className="rep-evol-col" key={i}>
                  <span className="rep-evol-val">{mes.cantidad}</span>
                  <div
                    className="rep-evol-bar"
                    style={{ height: calcularAlturaEvol(mes.cantidad, maxEvol) }}
                  />
                  <span className="rep-evol-mes">
                    {mes.mes?.substring(5) || mes.mes}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--texto-mut)', fontSize: 13, margin: 0 }}>
              Sin datos históricos suficientes para mostrar evolución temporal.
            </p>
          )}
        </div>

        {/* DISTRIBUCIÓN DE FORMACIÓN ACADÉMICA */}
        <div className="rep-card">
          <div className="rep-card-header">
            <h3 className="rep-card-title">
              <FiFileText size={15} /> Nivel de Formación Académica
            </h3>
          </div>
          <div>
            {distribucion_formacion.map((nivel, i) => (
              <div className="rep-form-row" key={i}>
                <div
                  className="rep-form-dot"
                  style={{ background: PALETTE[i % PALETTE.length] }}
                />
                <span className="rep-form-label">{nivel.nivel}</span>
                <span className="rep-form-count">{nivel.total}</span>
                <span className="rep-form-pct">{nivel.porcentaje}%</span>
              </div>
            ))}
            {distribucion_formacion.length === 0 && (
              <p style={{ color: 'var(--texto-mut)', fontSize: 13, margin: 0 }}>
                Sin datos de formación disponibles.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── FILA 4: RENDIMIENTO DE PRUEBAS + DISPONIBILIDAD ── */}
      <div className="rep-grid-2">

        {/* RENDIMIENTO EN PRUEBAS PSICOTÉCNICAS */}
        <div className="rep-card">
          <div className="rep-card-header">
            <h3 className="rep-card-title">
              <FiAward size={15} /> Desempeño en Pruebas Psicotécnicas
            </h3>
          </div>
          <div className="rep-stat-grid">
            <div className="rep-stat-item">
              <div className="rep-stat-value">{rendimiento_pruebas.total_examenes}</div>
              <div className="rep-stat-label">Exámenes Emitidos</div>
            </div>
            <div className="rep-stat-item">
              <div className="rep-stat-value" style={{ color: '#22c55e' }}>
                {rendimiento_pruebas.finalizados}
              </div>
              <div className="rep-stat-label">Finalizados</div>
            </div>
            <div className="rep-stat-item">
              <div className="rep-stat-value" style={{ color: '#f97316' }}>
                {rendimiento_pruebas.promedio_puntos}
              </div>
              <div className="rep-stat-label">Puntaje Promedio / 20</div>
            </div>
            <div className="rep-stat-item">
              <div className="rep-stat-value" style={{ color: '#8b5cf6' }}>
                {rendimiento_pruebas.tasa_aprobacion}%
              </div>
              <div className="rep-stat-label">Tasa de Aprobación</div>
            </div>
          </div>
          <div style={{
            marginTop: 14,
            display: 'flex',
            gap: 8,
            fontSize: 12,
            color: 'var(--texto-mut)',
            paddingTop: 12,
            borderTop: '1px solid var(--borde)'
          }}>
            <span>
              ✅ Aprobados (≥14 pts): <strong style={{ color: '#22c55e' }}>{rendimiento_pruebas.aprobados}</strong>
            </span>
            <span style={{ marginLeft: 'auto' }}>
              ❌ Reprobados: <strong style={{ color: '#ef4444' }}>{rendimiento_pruebas.reprobados}</strong>
            </span>
            <span>
              ⏳ Pendientes: <strong>{rendimiento_pruebas.pendientes}</strong>
            </span>
          </div>
        </div>

        {/* DISPONIBILIDAD HORARIA */}
        <div className="rep-card">
          <div className="rep-card-header">
            <h3 className="rep-card-title">
              <FiRotateCcw size={15} /> Disponibilidad Horaria de Candidatos
            </h3>
          </div>
          <div className="rep-disp-grid">
            <div className="rep-disp-item">
              <span
                className="rep-disp-pct"
                style={{ color: '#f97316' }}
              >
                {disponibilidad.rotativo_porcentaje}%
              </span>
              <span className="rep-disp-label">Disponibilidad para<br/>Turnos Rotativos</span>
            </div>
            <div className="rep-disp-item">
              <span
                className="rep-disp-pct"
                style={{ color: '#14b8a6' }}
              >
                {disponibilidad.fines_porcentaje}%
              </span>
              <span className="rep-disp-label">Disponibilidad en<br/>Fines de Semana</span>
            </div>
          </div>
          <p style={{
            marginTop: 14,
            fontSize: 12,
            color: 'var(--texto-mut)',
            lineHeight: 1.5,
            padding: '10px 12px',
            background: '#f8fafc',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--borde)'
          }}>
            <strong>Nota operativa:</strong> La disponibilidad horaria es un factor clave para puestos
            de hotelería. Candidatos con alta disponibilidad rotativa son prioritarios para
            posiciones de Front Desk, Restaurante y Housekeeping.
          </p>
        </div>
      </div>

    </div>
  );
};

export default ReportesPage;
