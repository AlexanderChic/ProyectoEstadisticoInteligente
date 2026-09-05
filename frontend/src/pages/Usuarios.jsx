import { useEffect, useState } from 'react';
import api, { errorMsg } from '../api/client.js';
import Modal from '../components/Modal.jsx';
import { PageHeader, Alerta, Cargando, fecha } from '../components/ui.jsx';

export default function Usuarios() {
  const [items, setItems] = useState(null);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol_id: '', activo: true });
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      const [u, r] = await Promise.all([api.get('/usuarios'), api.get('/usuarios/roles')]);
      setItems(u.data.data);
      setRoles(r.data.data);
    } catch (e) {
      setError(errorMsg(e));
    }
  };
  useEffect(() => {
    cargar();
  }, []);

  const abrir = (u = null) => {
    setForm(
      u
        ? { nombre: u.nombre, email: u.email, password: '', rol_id: u.rol_id, activo: u.activo }
        : { nombre: '', email: '', password: '', rol_id: roles[0]?.id || '', activo: true }
    );
    setModal(u || {});
    setError('');
  };

  const guardar = async () => {
    setGuardando(true);
    setError('');
    try {
      if (modal.id) await api.put(`/usuarios/${modal.id}`, form);
      else await api.post('/usuarios', form);
      setModal(null);
      cargar();
    } catch (e) {
      setError(errorMsg(e));
    } finally {
      setGuardando(false);
    }
  };

  const desactivar = async (id) => {
    if (!confirm('¿Desactivar este usuario?')) return;
    await api.delete(`/usuarios/${id}`);
    cargar();
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (!items) return <Cargando />;

  return (
    <>
      <PageHeader titulo="Usuarios" subtitulo="Gestión de accesos y roles">
        <button className="btn btn-primary" onClick={() => abrir()}>
          <i className="bi bi-person-plus me-1"></i>Nuevo usuario
        </button>
      </PageHeader>
      <Alerta tipo="danger" onClose={() => setError('')}>{error}</Alerta>

      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Último acceso</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id}>
                    <td className="fw-semibold">{u.nombre}</td>
                    <td className="small">{u.email}</td>
                    <td><span className="badge bg-primary-subtle text-primary">{u.rol}</span></td>
                    <td className="small text-muted">{u.ultimo_acceso ? fecha(u.ultimo_acceso) : 'Nunca'}</td>
                    <td>
                      {u.activo ? <span className="badge bg-success">Activo</span> : <span className="badge bg-secondary">Inactivo</span>}
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => abrir(u)}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => desactivar(u.id)}>
                        <i className="bi bi-person-dash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <Modal
          titulo={modal.id ? 'Editar usuario' : 'Nuevo usuario'}
          onClose={() => setModal(null)}
          onGuardar={guardar}
          guardando={guardando}
        >
          <div className="mb-3">
            <label className="form-label">Nombre *</label>
            <input className="form-control" value={form.nombre} onChange={set('nombre')} />
          </div>
          <div className="mb-3">
            <label className="form-label">Email *</label>
            <input type="email" className="form-control" value={form.email} onChange={set('email')} />
          </div>
          <div className="mb-3">
            <label className="form-label">
              Contraseña {modal.id && <span className="text-muted small">(dejar vacío para no cambiar)</span>}
            </label>
            <input type="password" className="form-control" value={form.password} onChange={set('password')} />
          </div>
          <div className="row g-3">
            <div className="col-md-7">
              <label className="form-label">Rol *</label>
              <select className="form-select" value={form.rol_id} onChange={set('rol_id')}>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </div>
            {modal.id && (
              <div className="col-md-5 d-flex align-items-end">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={form.activo}
                    onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  />
                  <label className="form-check-label">Usuario activo</label>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
