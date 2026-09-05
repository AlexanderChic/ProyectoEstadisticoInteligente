import { useEffect, useState } from 'react';
import api, { errorMsg } from '../api/client.js';
import Modal from '../components/Modal.jsx';
import { PageHeader, Alerta, Cargando, Vacio } from '../components/ui.jsx';

export default function Categorias() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '' });
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      const { data } = await api.get('/categorias');
      setItems(data.data);
    } catch (e) {
      setError(errorMsg(e));
    }
  };
  useEffect(() => {
    cargar();
  }, []);

  const abrir = (c = null) => {
    setForm(c ? { nombre: c.nombre, descripcion: c.descripcion || '' } : { nombre: '', descripcion: '' });
    setModal(c || {});
  };

  const guardar = async () => {
    setGuardando(true);
    setError('');
    try {
      if (modal.id) await api.put(`/categorias/${modal.id}`, form);
      else await api.post('/categorias', form);
      setModal(null);
      cargar();
    } catch (e) {
      setError(errorMsg(e));
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Desactivar esta categoría?')) return;
    await api.delete(`/categorias/${id}`);
    cargar();
  };

  if (!items) return <Cargando />;

  return (
    <>
      <PageHeader titulo="Categorías" subtitulo="Clasificación de productos">
        <button className="btn btn-primary" onClick={() => abrir()}>
          <i className="bi bi-plus-lg me-1"></i>Nueva categoría
        </button>
      </PageHeader>
      <Alerta tipo="danger" onClose={() => setError('')}>{error}</Alerta>

      <div className="card">
        <div className="card-body">
          {items.length === 0 ? (
            <Vacio texto="No hay categorías. Cree la primera." />
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    <th>Productos</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id}>
                      <td className="fw-semibold">{c.nombre}</td>
                      <td className="text-muted small">{c.descripcion || '-'}</td>
                      <td>{c.productos}</td>
                      <td>
                        {c.activo ? (
                          <span className="badge bg-success">Activa</span>
                        ) : (
                          <span className="badge bg-secondary">Inactiva</span>
                        )}
                      </td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-outline-primary me-1" onClick={() => abrir(c)}>
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => eliminar(c.id)}>
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
          titulo={modal.id ? 'Editar categoría' : 'Nueva categoría'}
          onClose={() => setModal(null)}
          onGuardar={guardar}
          guardando={guardando}
        >
          <div className="mb-3">
            <label className="form-label">Nombre *</label>
            <input
              className="form-control"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>
          <div className="mb-1">
            <label className="form-label">Descripción</label>
            <textarea
              className="form-control"
              rows="2"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </div>
        </Modal>
      )}
    </>
  );
}
