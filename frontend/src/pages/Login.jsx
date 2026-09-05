import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api, { errorMsg } from '../api/client.js';
import { Alerta } from '../components/ui.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [modo, setModo] = useState('login'); // 'login' | 'setup' | 'recuperar'
  const [form, setForm] = useState({ nombre: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [cargando, setCargando] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setOk('');
    setCargando(true);
    try {
      if (modo === 'login') {
        await login(form.email, form.password);
        navigate('/');
      } else if (modo === 'setup') {
        await api.post('/auth/setup', form);
        setOk('Administrador creado. Ahora inicie sesión.');
        setModo('login');
      } else if (modo === 'recuperar') {
        const { data } = await api.post('/auth/recuperar', { email: form.email });
        setOk(
          data.token_desarrollo
            ? `Token de recuperación (modo desarrollo): ${data.token_desarrollo}`
            : data.mensaje
        );
      }
    } catch (err) {
      setError(errorMsg(err));
    } finally {
      setCargando(false);
    }
  }

  const titulos = {
    login: 'Iniciar sesión',
    setup: 'Configuración inicial',
    recuperar: 'Recuperar contraseña',
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card shadow-lg">
        <div className="card-body p-4">
          <div className="text-center mb-4">
            <i className="bi bi-bar-chart-line-fill text-primary" style={{ fontSize: '2.5rem' }}></i>
            <h5 className="mt-2 mb-0">Sistema Inteligente Estadístico</h5>
            <div className="text-muted small">Distribuidora de Productos de Consumo Masivo</div>
          </div>

          <h6 className="mb-3">{titulos[modo]}</h6>
          <Alerta tipo="danger" onClose={() => setError('')}>{error}</Alerta>
          <Alerta tipo="success" onClose={() => setOk('')}>{ok}</Alerta>

          <form onSubmit={enviar}>
            {modo === 'setup' && (
              <div className="mb-3">
                <label className="form-label">Nombre completo</label>
                <input className="form-control" value={form.nombre} onChange={set('nombre')} required />
              </div>
            )}
            <div className="mb-3">
              <label className="form-label">Correo electrónico</label>
              <input type="email" className="form-control" value={form.email} onChange={set('email')} required />
            </div>
            {modo !== 'recuperar' && (
              <div className="mb-3">
                <label className="form-label">Contraseña</label>
                <input
                  type="password"
                  className="form-control"
                  value={form.password}
                  onChange={set('password')}
                  required
                />
              </div>
            )}
            <button className="btn btn-primary w-100" disabled={cargando}>
              {cargando ? 'Procesando...' : titulos[modo]}
            </button>
          </form>

          <div className="text-center mt-3 small">
            {modo === 'login' && (
              <>
                <a href="#" onClick={(e) => { e.preventDefault(); setModo('recuperar'); }}>
                  ¿Olvidó su contraseña?
                </a>
                <span className="text-muted mx-2">·</span>
                <a href="#" onClick={(e) => { e.preventDefault(); setModo('setup'); }}>
                  Configuración inicial
                </a>
              </>
            )}
            {modo !== 'login' && (
              <a href="#" onClick={(e) => { e.preventDefault(); setModo('login'); }}>
                ← Volver al inicio de sesión
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
