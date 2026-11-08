// ============================================================
// PÁGINA DE CONFIGURACIÓN DE CUENTA (ConfiguracionPage.jsx)
// Sistema SICS - Hotel Margarita Village
//
// Disponible para todos los usuarios (Reclutadores y Administradores).
// Permite visualizar datos de perfil y actualizar la contraseña de acceso.
// ============================================================

import { useState } from 'react';
import {
  FiSettings, FiLock, FiUser, FiMail, FiShield,
  FiCheckCircle, FiAlertCircle, FiLoader, FiKey
} from 'react-icons/fi';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import './ConfiguracionPage.css';

const ConfiguracionPage = () => {
  const { usuario } = useAuth();

  const [form, setForm] = useState({
    password_actual: '',
    password_nueva: '',
    confirmar_password: ''
  });

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMensajeExito(null);

    if (form.password_nueva.length < 6) {
      setError('La nueva contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }

    if (form.password_nueva !== form.confirmar_password) {
      setError('La nueva contraseña y la confirmación no coinciden.');
      return;
    }

    setCargando(true);

    try {
      const res = await api.put('/api/auth/cambiar-password', {
        password_actual: form.password_actual,
        password_nueva: form.password_nueva,
        confirmar_password: form.confirmar_password
      });

      setMensajeExito(res.data.mensaje || '¡Contraseña actualizada exitosamente!');
      setForm({
        password_actual: '',
        password_nueva: '',
        confirmar_password: ''
      });
      setTimeout(() => setMensajeExito(null), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo actualizar la contraseña. Verifica tu clave actual.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="config-page">
      <div className="config-header">
        <div>
          <h1 className="config-titulo">Configuración de Cuenta</h1>
          <p className="config-sub">
            Administra tus credenciales personales y parámetros de seguridad en SICS.
          </p>
        </div>
      </div>

      <div className="config-grid">
        {/* ── CARD 1: DATOS DE PERFIL ── */}
        <div className="config-card">
          <div className="card-header-icon">
            <FiUser size={20} className="color-azul" />
            <h3>Información del Usuario</h3>
          </div>
          <p className="card-desc">
            Datos institucionales asociados a tu sesión de trabajo.
          </p>

          <div className="user-profile-meta">
            <div className="profile-avatar-large">
              {usuario?.nombre?.charAt(0) || 'U'}
            </div>
            <div>
              <h4 className="profile-name">{usuario?.nombre || 'Usuario'}</h4>
              <span className={`profile-rol-badge ${usuario?.rol === 'administrador' ? 'rol-admin' : 'rol-reclutador'}`}>
                {usuario?.rol === 'administrador' ? 'Administrador' : 'Reclutador'}
              </span>
            </div>
          </div>

          <div className="profile-detail-list">
            <div className="profile-detail-item">
              <span className="detail-label"><FiMail size={14} /> Correo electrónico:</span>
              <span className="detail-value">{usuario?.email || '—'}</span>
            </div>
            <div className="profile-detail-item">
              <span className="detail-label"><FiShield size={14} /> Permisos en sistema:</span>
              <span className="detail-value">
                {usuario?.rol === 'administrador'
                  ? 'Acceso total (Gestión de usuarios, métricas, exámenes y expedientes)'
                  : 'Reclutamiento (Evaluaciones de candidatos, entrevistas y expedientes)'}
              </span>
            </div>
          </div>
        </div>

        {/* ── CARD 2: CAMBIO DE CONTRASEÑA ── */}
        <div className="config-card">
          <div className="card-header-icon">
            <FiKey size={20} className="color-azul" />
            <h3>Cambiar Contraseña</h3>
          </div>
          <p className="card-desc">
            Por seguridad, asegúrate de ingresar una contraseña de al menos 6 caracteres.
          </p>

          {mensajeExito && (
            <div className="alerta alerta-exito" style={{ marginBottom: 16 }}>
              <FiCheckCircle size={18} />
              <span>{mensajeExito}</span>
            </div>
          )}

          {error && (
            <div className="alerta alerta-error" style={{ marginBottom: 16 }}>
              <FiAlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="form-password">
            <div className="form-group">
              <label htmlFor="password_actual">Contraseña Actual *</label>
              <div className="input-with-icon">
                <FiLock size={15} className="input-icon" />
                <input
                  type="password"
                  id="password_actual"
                  name="password_actual"
                  value={form.password_actual}
                  onChange={handleChange}
                  placeholder="Ingresa tu clave actual"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password_nueva">Nueva Contraseña *</label>
              <div className="input-with-icon">
                <FiKey size={15} className="input-icon" />
                <input
                  type="password"
                  id="password_nueva"
                  name="password_nueva"
                  value={form.password_nueva}
                  onChange={handleChange}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmar_password">Confirmar Nueva Contraseña *</label>
              <div className="input-with-icon">
                <FiCheckCircle size={15} className="input-icon" />
                <input
                  type="password"
                  id="confirmar_password"
                  name="confirmar_password"
                  value={form.confirmar_password}
                  onChange={handleChange}
                  placeholder="Repite la nueva contraseña"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-guardar-password" disabled={cargando}>
              {cargando ? (
                <><FiLoader className="config-spin" size={16} /> Actualizando...</>
              ) : (
                'Actualizar Contraseña'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionPage;
