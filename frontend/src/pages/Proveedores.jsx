import { useEffect, useState } from 'react';
import api, { errorMsg } from '../api/client.js';
import Modal from '../components/Modal.jsx';
import { PageHeader, Alerta, Cargando, Vacio } from '../components/ui.jsx';

const vacio = { nombre: '', contacto: '', telefono: '', email: '', direccion: '' };

export default function Proveedores() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(vacio);
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      const { data } = await api.get('/proveedores');
      setItems(data.data);
    } catch (e) {
      setError(errorMsg(e));
    }
  };
  useEffect(() => {
    cargar();
  }, []);

  const abrir = (p = null) => {
    setForm(p ? { ...p } : vacio);
    setModal(p || {});
    setError('');
  };

  const guardar = async () => {
    setGuardando(true);
    setError('');
    try {
      if (modal.id) await api.put(`/proveedores/${modal.id}`, form);
      else await api.post('/proveedores', form);
      setModal(null);
      cargar();
    } catch (e) {
      setError(errorMsg(e));
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Desactivar este proveedor?')) return;
    await api.delete(`/proveedores/${id}`);
    cargar();
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (!items) return <Cargando />;

  return (
    <>
      <PageHeader titulo="Proveedores" subtitulo="Directorio de proveedores">
        <button className="btn btn-primary" onClick={() => abrir()}>
          <i className="bi bi-plus-lg me-1"></i>Nuevo proveedor
        </button>
      </PageHeader>
      <Alerta tipo="danger" onClose={() => setError('')}>{error}</Alerta>

      <div className="card">
        <div className="card-body">
          {items.length === 0 ? (
            <Vacio texto="No hay proveedores registrados." />
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Contacto</th>
                    <th>Teléfono</th>
                    <th>Email</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id}>
                      <td className="fw-semibold">{p.nombre}</td>
                      <td>{p.contacto || '-'}</td>
                      <td>{p.telefono || '-'}</td>
                      <td className="small">{p.email || '-'}</td>
                      <td>
                        {p.activo ? (
                          <span className="badge bg-success">Activo</span>
                        ) : (
                          <span className="badge bg-secondary">Inactivo</span>
                        )}
                      </td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-outline-primary me-1" onClick={() => abrir(p)}>
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => eliminar(p.id)}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <Modal
          titulo={modal.id ? 'Editar proveedor' : 'Nuevo proveedor'}
          onClose={() => setModal(null)}
          onGuardar={guardar}
          guardando={guardando}
        >
          <div className="mb-3">
            <label className="form-label">Nombre *</label>
            <input className="form-control" value={form.nombre} onChange={set('nombre')} />
          </div>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Contacto</label>
              <input className="form-control" value={form.contacto || ''} onChange={set('contacto')} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Teléfono</label>
              <input className="form-control" value={form.telefono || ''} onChange={set('telefono')} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Email</label>
              <input type="email" className="form-control" value={form.email || ''} onChange={set('email')} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Dirección</label>
              <input className="form-control" value={form.direccion || ''} onChange={set('direccion')} />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
