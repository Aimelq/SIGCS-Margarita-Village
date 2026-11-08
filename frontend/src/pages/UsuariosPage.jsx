// ============================================================
// PÁGINA DE GESTIÓN DE USUARIOS (UsuariosPage.jsx)
// Sistema SICS - Hotel Margarita Village
//
// Módulo exclusivo para usuarios con rol 'administrador'.
// Permite listar las cuentas del personal, dar de alta nuevos
// usuarios (reclutadores o administradores) y activar/desactivar accesos.
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUsers, FiUserPlus, FiShield, FiCheckCircle,
  FiXCircle, FiLock, FiMail, FiCreditCard, FiAlertCircle,
  FiLoader, FiToggleLeft, FiToggleRight, FiRefreshCw
} from 'react-icons/fi';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import './UsuariosPage.css';

const UsuariosPage = () => {
  const { usuario: usuarioActual } = useAuth();
  const navigate = useNavigate();

  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  // Estados del modal de creación
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState(null);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: '',
    apellido: '',
    cedula: '',
    email: '',
    clave: '',
    rol: 'reclutador',
    activo: true
  });

  // Si por alguna razón un no-admin entra por URL, se redirige
  useEffect(() => {
    if (usuarioActual && usuarioActual.rol !== 'administrador') {
      navigate('/dashboard');
    } else {
      cargarUsuarios();
    }
  }, [usuarioActual]);

  const cargarUsuarios = async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await api.get('/api/usuarios');
      setUsuarios(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar la lista de usuarios.');
    } finally {
      setCargando(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNuevoUsuario(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    setFormError(null);
    setGuardando(true);

    try {
      const res = await api.post('/api/usuarios', nuevoUsuario);
      setMensajeExito(res.data.mensaje || 'Usuario creado exitosamente.');
      setModalAbierto(false);
      setNuevoUsuario({
        nombre: '',
        apellido: '',
        cedula: '',
        email: '',
        clave: '',
        rol: 'reclutador',
        activo: true
      });
      await cargarUsuarios();
      setTimeout(() => setMensajeExito(null), 4000);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Error al registrar el usuario.');
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleEstado = async (u) => {
    const nuevoEstado = !u.activo;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    if (!window.confirm(`¿Estás seguro de que deseas ${accion} la cuenta de ${u.nombre} ${u.apellido}?`)) {
      return;
    }

    try {
      await api.patch(`/api/usuarios/${u.id}/estado`, { activo: nuevoEstado });
      setUsuarios(prev => prev.map(item => item.id === u.id ? { ...item, activo: nuevoEstado } : item));
      setMensajeExito(`Cuenta de ${u.nombre} ${accion}da exitosamente.`);
      setTimeout(() => setMensajeExito(null), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al cambiar el estado del usuario.');
    }
  };

  const handleCambiarRol = async (u, nuevoRol) => {
    if (u.rol === nuevoRol) return;

    const nombreRol = nuevoRol === 'administrador' ? 'Administrador' : 'Reclutador';
    const confirmacion = window.confirm(
      `¿Deseas cambiar el rol de ${u.nombre} ${u.apellido} a "${nombreRol}"?\n\n` +
      (nuevoRol === 'administrador'
        ? 'Tendrá acceso completo a la gestión de usuarios y métricas del sistema.'
        : 'Solo tendrá acceso a evaluaciones, entrevistas y expedientes de candidatos.')
    );

    if (!confirmacion) return;

    try {
      await api.patch(`/api/usuarios/${u.id}/rol`, { rol: nuevoRol });
      setUsuarios(prev => prev.map(item => item.id === u.id ? { ...item, rol: nuevoRol } : item));
      setMensajeExito(`Rol de ${u.nombre} actualizado a "${nombreRol}" exitosamente.`);
      setTimeout(() => setMensajeExito(null), 3500);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al cambiar el rol del usuario.');
    }
  };

  // Contadores para métricas
  const totalUsuarios = usuarios.length;
  const totalAdmins = usuarios.filter(u => u.rol === 'administrador').length;
  const totalReclutadores = usuarios.filter(u => u.rol === 'reclutador').length;
  const totalActivos = usuarios.filter(u => u.activo).length;

  return (
    <div className="usuarios-page">
      {/* ── ENCABEZADO ── */}
      <div className="usuarios-header">
        <div>
          <h1 className="usuarios-titulo">Gestión de Usuarios y Personal</h1>
          <p className="usuarios-sub">
            Control de cuentas institucionales, asignación de roles y estados de acceso al sistema SICS.
          </p>
        </div>
        <button className="btn-nuevo-usuario" onClick={() => { setFormError(null); setModalAbierto(true); }}>
          <FiUserPlus size={16} /> Nuevo Usuario
        </button>
      </div>

      {/* ── ALERTAS DE ESTADO ── */}
      {mensajeExito && (
        <div className="alerta alerta-exito">
          <FiCheckCircle size={18} />
          <span>{mensajeExito}</span>
        </div>
      )}

      {error && (
        <div className="alerta alerta-error">
          <FiAlertCircle size={18} />
          <span>{error}</span>
          <button className="btn-reintentar" onClick={cargarUsuarios}>
            <FiRefreshCw size={14} /> Reintentar
          </button>
        </div>
      )}

      {/* ── CARDS RESUMEN ── */}
      <div className="usuarios-stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrap bg-azul-soft">
            <FiUsers size={20} className="color-azul" />
          </div>
          <div>
            <span className="stat-num">{totalUsuarios}</span>
            <span className="stat-label">Total Cuentas</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap bg-purpura-soft">
            <FiShield size={20} className="color-purpura" />
          </div>
          <div>
            <span className="stat-num">{totalAdmins}</span>
            <span className="stat-label">Administradores</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap bg-verde-soft">
            <FiCheckCircle size={20} className="color-verde" />
          </div>
          <div>
            <span className="stat-num">{totalActivos}</span>
            <span className="stat-label">Cuentas Activas</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap bg-naranja-soft">
            <FiUsers size={20} className="color-naranja" />
          </div>
          <div>
            <span className="stat-num">{totalReclutadores}</span>
            <span className="stat-label">Reclutadores</span>
          </div>
        </div>
      </div>

      {/* ── TABLA DE USUARIOS ── */}
      <div className="usuarios-tabla-card">
        <div className="tabla-header-info">
          <h3>Personal Registrado</h3>
          <span className="tabla-badge">{usuarios.length} registros</span>
        </div>

        {cargando ? (
          <div className="usuarios-loading">
            <FiLoader className="usuarios-spin" size={24} />
            <p>Cargando lista de usuarios...</p>
          </div>
        ) : (
          <div className="tabla-responsive">
            <table className="tabla-usuarios">
              <thead>
                <tr>
                  <th>Nombre y Apellido</th>
                  <th>Cédula</th>
                  <th>Correo Institucional</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => {
                  const esPropioUsuario = String(u.id) === String(usuarioActual?.id);
                  return (
                    <tr key={u.id} className={!u.activo ? 'fila-inactiva' : ''}>
                      <td>
                        <div className="col-user">
                          <div className={`avatar-circulo ${u.rol === 'administrador' ? 'av-admin' : 'av-reclutador'}`}>
                            {u.nombre?.charAt(0)}{u.apellido?.charAt(0) || ''}
                          </div>
                          <div>
                            <span className="user-fullname">{u.nombre} {u.apellido}</span>
                            {esPropioUsuario && <span className="tag-tu">(Tú)</span>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="user-cedula">{u.cedula || '—'}</span>
                      </td>
                      <td>
                        <span className="user-email">{u.email}</span>
                      </td>
                      <td>
                        {esPropioUsuario ? (
                          <span className="rol-badge rol-admin" title="No puedes cambiar tu propio rol en sesión">
                            Administrador (Tú)
                          </span>
                        ) : (
                          <select
                            className={`select-rol-inline ${u.rol === 'administrador' ? 'sel-admin' : 'sel-reclutador'}`}
                            value={u.rol}
                            onChange={(e) => handleCambiarRol(u, e.target.value)}
                            title="Haz clic para cambiar el rol de este usuario"
                          >
                            <option value="reclutador">Reclutador</option>
                            <option value="administrador">Administrador</option>
                          </select>
                        )}
                      </td>
                      <td>
                        <span className={`estado-badge ${u.activo ? 'est-activo' : 'est-inactivo'}`}>
                          {u.activo ? (
                            <><FiCheckCircle size={12} /> Activo</>
                          ) : (
                            <><FiXCircle size={12} /> Desactivado</>
                          )}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {esPropioUsuario ? (
                          <span className="btn-disabled-label" title="No puedes desactivar tu propia cuenta">
                            En sesión
                          </span>
                        ) : (
                          <button
                            className={`btn-toggle-estado ${u.activo ? 'btn-desactivar' : 'btn-activar'}`}
                            onClick={() => handleToggleEstado(u)}
                            title={u.activo ? 'Desactivar acceso' : 'Habilitar acceso'}
                          >
                            {u.activo ? (
                              <><FiToggleRight size={16} /> Desactivar</>
                            ) : (
                              <><FiToggleLeft size={16} /> Activar</>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL: CREAR NUEVO USUARIO ── */}
      {modalAbierto && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModalAbierto(false); }}>
          <div className="modal-content modal-usuario">
            <div className="modal-header">
              <div className="modal-title-wrap">
                <FiUserPlus size={20} className="color-azul" />
                <h3>Registrar Nuevo Usuario</h3>
              </div>
              <button className="btn-modal-close" onClick={() => setModalAbierto(false)}>✕</button>
            </div>

            {formError && (
              <div className="alerta alerta-error" style={{ margin: '0 0 16px 0' }}>
                <FiAlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCrearUsuario} className="form-nuevo-usuario">
              <div className="form-grid-2">
                <div className="form-group">
                  <label htmlFor="nombre">Nombres *</label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={nuevoUsuario.nombre}
                    onChange={handleInputChange}
                    placeholder="Ej. Carlos"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="apellido">Apellidos *</label>
                  <input
                    type="text"
                    id="apellido"
                    name="apellido"
                    value={nuevoUsuario.apellido}
                    onChange={handleInputChange}
                    placeholder="Ej. Rodríguez"
                    required
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label htmlFor="cedula">Cédula de Identidad *</label>
                  <input
                    type="text"
                    id="cedula"
                    name="cedula"
                    value={nuevoUsuario.cedula}
                    onChange={handleInputChange}
                    placeholder="Ej. V-18234567"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Correo Institucional *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={nuevoUsuario.email}
                    onChange={handleInputChange}
                    placeholder="usuario@margaritavillage.com"
                    required
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label htmlFor="clave">Contraseña Inicial *</label>
                  <input
                    type="password"
                    id="clave"
                    name="clave"
                    value={nuevoUsuario.clave}
                    onChange={handleInputChange}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="rol">Rol de Acceso *</label>
                  <select
                    id="rol"
                    name="rol"
                    value={nuevoUsuario.rol}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="reclutador">Reclutador (Entrevistas y Expedientes)</option>
                    <option value="administrador">Administrador (Control Total)</option>
                  </select>
                </div>
              </div>

              <div className="form-group-checkbox">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="activo"
                    checked={nuevoUsuario.activo}
                    onChange={handleInputChange}
                  />
                  <span>Habilitar cuenta inmediatamente (Usuario Activo)</span>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setModalAbierto(false)}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-modal-save"
                  disabled={guardando}
                >
                  {guardando ? (
                    <><FiLoader className="usuarios-spin" size={16} /> Registrando...</>
                  ) : (
                    'Guardar Usuario'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsuariosPage;
