// ============================================================
// PÁGINA DEL BANCO DE PREGUNTAS TÉCNICAS (ExamenesPage.jsx)
// Sistema SICS — Hotel Margarita Village
// Sprint 7: Módulo de Gestión de Exámenes
//
// Permite al personal de Recursos Humanos administrar el catálogo
// de reactivos técnicos mediante operaciones CRUD completas:
//   - Listar todas las preguntas con filtro por tipo.
//   - Crear preguntas abiertas (texto libre) o de selección múltiple.
//   - Editar el contenido de preguntas existentes.
//   - Eliminar reactivos que no estén asignados a ningún examen.
//
// Cada pregunta de tipo 'multiple' contiene una lista de opciones
// que se gestiona dinámicamente en el modal de creación/edición.
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import {
  FiPlus, FiEdit2, FiTrash2, FiLoader, FiFilter,
  FiFileText, FiList, FiAlignLeft, FiX, FiCheck, FiAlertTriangle
} from 'react-icons/fi'
import api from '../api/axios'
import './ExamenesPage.css'

// -------------------------------------------------------
// VALORES INICIALES DEL FORMULARIO DE PREGUNTA
// Se utiliza tanto en creación como en edición.
// -------------------------------------------------------
const FORM_INICIAL = {
  texto: '',
  tipo: 'abierta',
  opciones: ['', ''],
  respuesta_correcta: ''
}

const ExamenesPage = () => {
  // Lista de preguntas recuperadas del servidor
  const [preguntas, setPreguntas] = useState([])

  // Estado de carga durante las peticiones asíncronas
  const [cargando, setCargando] = useState(true)

  // Filtro activo por tipo de pregunta ('', 'abierta', 'multiple')
  const [filtroTipo, setFiltroTipo] = useState('')

  // Estado del modal de creación/edición
  const [modalAbierto, setModalAbierto] = useState(false)

  // ID de la pregunta en edición; null si es una nueva pregunta
  const [editandoId, setEditandoId] = useState(null)

  // Datos del formulario activo en el modal
  const [form, setForm] = useState(FORM_INICIAL)

  // Estado de envío del formulario
  const [guardando, setGuardando] = useState(false)

  // Mensaje de error mostrado dentro del modal
  const [errorModal, setErrorModal] = useState('')

  // Estado del modal de confirmación de eliminación
  const [modalEliminar, setModalEliminar] = useState(null)

  // Estado de eliminación en proceso
  const [eliminando, setEliminando] = useState(false)

  // Mensaje de error de la operación de eliminación
  const [errorEliminar, setErrorEliminar] = useState('')

  // -------------------------------------------------------
  // CARGA DE PREGUNTAS DESDE LA API
  // -------------------------------------------------------
  const cargarPreguntas = useCallback(async () => {
    setCargando(true)
    try {
      const params = filtroTipo ? `?tipo=${filtroTipo}` : ''
      const res = await api.get(`/api/preguntas${params}`)
      setPreguntas(res.data)
    } catch (err) {
      console.error('Error al cargar el banco de preguntas:', err)
    } finally {
      setCargando(false)
    }
  }, [filtroTipo])

  useEffect(() => {
    cargarPreguntas()
  }, [cargarPreguntas])

  // -------------------------------------------------------
  // MANEJO DEL FORMULARIO
  // -------------------------------------------------------

  // Abre el modal en modo creación con campos vacíos
  const abrirModalCrear = () => {
    setForm(FORM_INICIAL)
    setEditandoId(null)
    setErrorModal('')
    setModalAbierto(true)
  }

  // Abre el modal en modo edición con los datos de la pregunta seleccionada
  const abrirModalEditar = (pregunta) => {
    setForm({
      texto: pregunta.texto || '',
      tipo: pregunta.tipo || 'abierta',
      opciones: pregunta.opciones && pregunta.opciones.length >= 2
        ? pregunta.opciones
        : ['', ''],
      respuesta_correcta: pregunta.respuesta_correcta || ''
    })
    setEditandoId(pregunta.id)
    setErrorModal('')
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setEditandoId(null)
    setForm(FORM_INICIAL)
    setErrorModal('')
  }

  // Actualiza el texto de una opción específica en la lista de opciones
  const handleOpcionChange = (index, valor) => {
    const nuevasOpciones = [...form.opciones]
    nuevasOpciones[index] = valor
    setForm(prev => ({ ...prev, opciones: nuevasOpciones }))
  }

  // Agrega una nueva opción vacía al final de la lista (máximo 6 opciones)
  const agregarOpcion = () => {
    if (form.opciones.length >= 6) return
    setForm(prev => ({ ...prev, opciones: [...prev.opciones, ''] }))
  }

  // Elimina una opción específica de la lista (mínimo 2 opciones)
  const eliminarOpcion = (index) => {
    if (form.opciones.length <= 2) return
    const nuevasOpciones = form.opciones.filter((_, i) => i !== index)
    setForm(prev => ({ ...prev, opciones: nuevasOpciones }))
  }

  // Envía el formulario al backend (crea o actualiza según editandoId)
  const handleGuardar = async () => {
    setErrorModal('')

    if (!form.texto.trim()) {
      setErrorModal('El enunciado de la pregunta es obligatorio.')
      return
    }

    const opcionesLimpias = form.opciones.map(o => o.trim()).filter(Boolean)

    if (form.tipo === 'multiple' && opcionesLimpias.length < 2) {
      setErrorModal('Las preguntas de tipo múltiple requieren al menos 2 opciones con contenido.')
      return
    }

    setGuardando(true)
    try {
      const payload = {
        texto: form.texto.trim(),
        tipo: form.tipo,
        opciones: form.tipo === 'multiple' ? opcionesLimpias : [],
        respuesta_correcta: form.tipo === 'multiple' ? form.respuesta_correcta.trim() : ''
      }

      if (editandoId) {
        await api.put(`/api/preguntas/${editandoId}`, payload)
      } else {
        await api.post('/api/preguntas', payload)
      }

      cerrarModal()
      await cargarPreguntas()
    } catch (err) {
      setErrorModal(err.response?.data?.error || 'Ocurrió un error al guardar la pregunta.')
    } finally {
      setGuardando(false)
    }
  }

  // -------------------------------------------------------
  // ELIMINACIÓN DE PREGUNTA
  // -------------------------------------------------------

  // Abre el modal de confirmación antes de ejecutar la eliminación
  const abrirModalEliminar = (pregunta) => {
    setModalEliminar(pregunta)
    setErrorEliminar('')
  }

  const confirmarEliminar = async () => {
    if (!modalEliminar) return
    setEliminando(true)
    setErrorEliminar('')
    try {
      await api.delete(`/api/preguntas/${modalEliminar.id}`)
      setModalEliminar(null)
      await cargarPreguntas()
    } catch (err) {
      setErrorEliminar(err.response?.data?.error || 'No se pudo eliminar la pregunta.')
    } finally {
      setEliminando(false)
    }
  }

  // Contadores por tipo para el resumen visual
  const totalAbiertas = preguntas.filter(p => p.tipo === 'abierta').length
  const totalMultiple = preguntas.filter(p => p.tipo === 'multiple').length

  return (
    <div className="examenes-page">

      {/* Cabecera del módulo con título y botón de creación */}
      <div className="exam-header">
        <div>
          <h1 className="exam-titulo">Banco de Preguntas Técnicas</h1>
          <p className="exam-subtitulo">
            {preguntas.length} pregunta{preguntas.length !== 1 ? 's' : ''} registrada{preguntas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-primary btn-nueva-pregunta" onClick={abrirModalCrear}>
          <FiPlus size={15} />
          Nueva pregunta
        </button>
      </div>

      {/* Tarjetas de resumen estadístico por tipo */}
      <div className="exam-stats">
        <div className="exam-stat-card">
          <div className="exam-stat-icon bg-blue-100">
            <FiAlignLeft size={18} />
          </div>
          <div>
            <p className="exam-stat-num">{totalAbiertas}</p>
            <p className="exam-stat-label">Abiertas</p>
          </div>
        </div>
        <div className="exam-stat-card">
          <div className="exam-stat-icon bg-orange-100">
            <FiList size={18} />
          </div>
          <div>
            <p className="exam-stat-num">{totalMultiple}</p>
            <p className="exam-stat-label">Selección múltiple</p>
          </div>
        </div>
        <div className="exam-stat-card">
          <div className="exam-stat-icon bg-green-100">
            <FiFileText size={18} />
          </div>
          <div>
            <p className="exam-stat-num">{preguntas.length}</p>
            <p className="exam-stat-label">Total en banco</p>
          </div>
        </div>
      </div>

      {/* Barra de filtros rápidos por tipo */}
      <div className="exam-filtros">
        <FiFilter size={14} className="exam-filter-icon" />
        <button
          className={`exam-filter-btn ${filtroTipo === '' ? 'activo' : ''}`}
          onClick={() => setFiltroTipo('')}
        >
          Todas
        </button>
        <button
          className={`exam-filter-btn ${filtroTipo === 'abierta' ? 'activo' : ''}`}
          onClick={() => setFiltroTipo('abierta')}
        >
          Abiertas
        </button>
        <button
          className={`exam-filter-btn ${filtroTipo === 'multiple' ? 'activo' : ''}`}
          onClick={() => setFiltroTipo('multiple')}
        >
          Selección múltiple
        </button>
      </div>

      {/* Tabla principal del banco de preguntas */}
      <div className="exam-tabla-wrap">
        {cargando ? (
          <div className="exam-loading">
            <FiLoader className="spin-anim" size={22} />
            <p>Cargando banco de preguntas...</p>
          </div>
        ) : preguntas.length === 0 ? (
          <div className="exam-empty">
            <FiFileText size={48} style={{ opacity: 0.15 }} />
            <p>
              {filtroTipo
                ? `No hay preguntas de tipo "${filtroTipo === 'multiple' ? 'selección múltiple' : filtroTipo}" registradas.`
                : 'El banco está vacío. Crea la primera pregunta con el botón de arriba.'}
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>#</th>
                <th>Enunciado y opciones</th>
                <th style={{ width: 150 }}>Tipo</th>
                <th style={{ width: 180 }}>Respuesta correcta</th>
                <th style={{ width: 120 }}>Creada por</th>
                <th style={{ width: 100 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {preguntas.map((p, idx) => (
                <tr key={p.id}>
                  <td className="exam-num-cell">{idx + 1}</td>
                  <td>
                    <span className="exam-enunciado">{p.texto}</span>
                    {/* Muestra vista previa de las opciones en preguntas de selección múltiple */}
                    {p.tipo === 'multiple' && p.opciones?.length > 0 && (
                      <div className="exam-opciones-preview">
                        {p.opciones.map((op, i) => (
                          <span
                            key={i}
                            className={`exam-opcion-chip ${op === p.respuesta_correcta ? 'correcta' : ''}`}
                          >
                            {String.fromCharCode(65 + i)}. {op}
                            {op === p.respuesta_correcta && <FiCheck size={10} />}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${p.tipo === 'multiple' ? 'badge-orange' : 'badge-blue'}`}>
                      {p.tipo === 'multiple' ? 'Múltiple' : 'Abierta'}
                    </span>
                  </td>
                  <td className="exam-respuesta-cell">
                    {p.respuesta_correcta
                      ? <span className="exam-resp-text">{p.respuesta_correcta}</span>
                      : <span className="text-muted">—</span>}
                  </td>
                  <td className="text-muted exam-creador-cell">
                    {p.nombre_creador || '—'}
                  </td>
                  <td>
                    <div className="exam-acciones">
                      <button
                        className="btn-icon-edit"
                        title="Editar pregunta"
                        onClick={() => abrirModalEditar(p)}
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button
                        className="btn-icon-delete"
                        title="Eliminar pregunta"
                        onClick={() => abrirModalEliminar(p)}
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ============================================
          MODAL: CREACIÓN Y EDICIÓN DE PREGUNTA
          ============================================ */}
      {modalAbierto && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>

            <div className="modal-header">
              <h2>{editandoId ? 'Editar pregunta' : 'Nueva pregunta'}</h2>
              <button className="modal-close" onClick={cerrarModal}>
                <FiX size={18} />
              </button>
            </div>

            <div className="modal-body">

              {/* Selector del tipo de reactivo */}
              <div className="form-group">
                <label className="form-label">Tipo de pregunta *</label>
                <div className="exam-tipo-selector">
                  <button
                    type="button"
                    className={`exam-tipo-btn ${form.tipo === 'abierta' ? 'seleccionado' : ''}`}
                    onClick={() => setForm(prev => ({ ...prev, tipo: 'abierta' }))}
                  >
                    <FiAlignLeft size={14} />
                    Pregunta abierta
                  </button>
                  <button
                    type="button"
                    className={`exam-tipo-btn ${form.tipo === 'multiple' ? 'seleccionado' : ''}`}
                    onClick={() => setForm(prev => ({ ...prev, tipo: 'multiple' }))}
                  >
                    <FiList size={14} />
                    Selección múltiple
                  </button>
                </div>
              </div>

              {/* Campo de texto del enunciado */}
              <div className="form-group">
                <label className="form-label" htmlFor="input-enunciado">
                  Enunciado de la pregunta *
                </label>
                <textarea
                  id="input-enunciado"
                  className="input-field"
                  rows={3}
                  placeholder="Escribe aquí el reactivo o pregunta técnica..."
                  value={form.texto}
                  onChange={e => setForm(prev => ({ ...prev, texto: e.target.value }))}
                />
              </div>

              {/* Gestión dinámica de opciones (solo para tipo múltiple) */}
              {form.tipo === 'multiple' && (
                <div className="form-group">
                  <label className="form-label">
                    Opciones de respuesta *
                    <span className="form-hint">Mínimo 2 — Máximo 6</span>
                  </label>
                  <div className="exam-opciones-list">
                    {form.opciones.map((op, i) => (
                      <div key={i} className="exam-opcion-row">
                        <span className="exam-opcion-letra">{String.fromCharCode(65 + i)}</span>
                        <input
                          className="input-field"
                          type="text"
                          placeholder={`Opción ${String.fromCharCode(65 + i)}`}
                          value={op}
                          onChange={e => handleOpcionChange(i, e.target.value)}
                        />
                        {form.opciones.length > 2 && (
                          <button
                            type="button"
                            className="btn-remove-opcion"
                            onClick={() => eliminarOpcion(i)}
                            title="Eliminar esta opción"
                          >
                            <FiX size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {form.opciones.length < 6 && (
                    <button type="button" className="btn-add-opcion" onClick={agregarOpcion}>
                      <FiPlus size={13} /> Agregar opción
                    </button>
                  )}
                </div>
              )}

              {/* Selector de la respuesta correcta (solo para tipo múltiple) */}
              {form.tipo === 'multiple' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="select-respuesta">
                    Respuesta correcta
                    <span className="form-hint">Opcional — usada en calificación automática (Sprint 8)</span>
                  </label>
                  <select
                    id="select-respuesta"
                    className="input-field"
                    value={form.respuesta_correcta}
                    onChange={e => setForm(prev => ({ ...prev, respuesta_correcta: e.target.value }))}
                  >
                    <option value="">Sin respuesta correcta definida</option>
                    {form.opciones.filter(Boolean).map((op, i) => (
                      <option key={i} value={op}>
                        {String.fromCharCode(65 + i)}. {op}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Banner de error de validación */}
              {errorModal && (
                <div className="exam-error-banner">
                  <FiAlertTriangle size={14} />
                  {errorModal}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={cerrarModal} disabled={guardando}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleGuardar} disabled={guardando}>
                {guardando
                  ? <><span className="spinner" /> Guardando...</>
                  : editandoId ? 'Guardar cambios' : 'Crear pregunta'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          MODAL: CONFIRMACIÓN DE ELIMINACIÓN
          ============================================ */}
      {modalEliminar && (
        <div className="modal-overlay" onClick={() => setModalEliminar(null)}>
          <div className="modal-panel modal-confirm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirmar eliminación</h2>
              <button className="modal-close" onClick={() => setModalEliminar(null)}>
                <FiX size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="confirm-icon-wrap">
                <FiAlertTriangle size={32} className="confirm-icon" />
              </div>
              <p className="confirm-msg">
                ¿Está seguro/a de eliminar esta pregunta del banco de reactivos?
              </p>
              <div className="confirm-preview">
                <span className={`badge ${modalEliminar.tipo === 'multiple' ? 'badge-orange' : 'badge-blue'}`}>
                  {modalEliminar.tipo === 'multiple' ? 'Múltiple' : 'Abierta'}
                </span>
                <p>"{modalEliminar.texto}"</p>
              </div>
              <p className="confirm-warning">
                Esta acción no puede deshacerse. Si la pregunta está asignada a un examen activo, el sistema no permitirá eliminarla.
              </p>
              {errorEliminar && (
                <div className="exam-error-banner">
                  <FiAlertTriangle size={14} />
                  {errorEliminar}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModalEliminar(null)} disabled={eliminando}>
                Cancelar
              </button>
              <button className="btn-danger" onClick={confirmarEliminar} disabled={eliminando}>
                {eliminando
                  ? <><span className="spinner" /> Eliminando...</>
                  : <><FiTrash2 size={14} /> Eliminar pregunta</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default ExamenesPage
