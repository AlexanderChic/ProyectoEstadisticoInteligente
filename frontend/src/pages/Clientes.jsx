import { useEffect, useState } from 'react';
import api, { errorMsg } from '../api/client.js';
import Modal from '../components/Modal.jsx';
import { PageHeader, Alerta, Cargando, Vacio } from '../components/ui.jsx';

const vacio = { nombre: '', telefono: '', nit: '' };

export default function Clientes() {
  const [items, setItems] = useState(null);
  const [buscar, setBuscar] = useState('');
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(vacio);
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      const { data } = await api.get('/clientes', { params: { buscar: buscar || undefined } });
      setItems(data.data);
    } catch (e) {
      setError(errorMsg(e));
    }
  };
  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
  }, [buscar]);

  const abrir = (c = null) => {
    setForm(c ? { nombre: c.nombre, telefono: c.telefono || '', nit: c.nit || '' } : vacio);
    setModal(c || {});
    setError('');
  };

  const guardar = async () => {
    setGuardando(true);
    setError('');
    try {
      if (modal.id) await api.put(`/clientes/${modal.id}`, form);
      else await api.post('/clientes', form);
      setModal(null);
      cargar();
    } catch (e) {
      setError(errorMsg(e));
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    await api.delete(`/clientes/${id}`);
    cargar();
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHeader titulo="Clientes" subtitulo="Directorio de clientes (cada cliente puede tener varias direcciones)">
        <button className="btn btn-primary" onClick={() => abrir()}>
          <i className="bi bi-plus-lg me-1"></i>Nuevo cliente
        </button>
      </PageHeader>
      <Alerta tipo="danger" onClose={() => setError('')}>{error}</Alerta>

      <div className="card">
        <div className="card-body">
          <div className="input-group mb-3" style={{ maxWidth: 360 }}>
            <span className="input-group-text"><i className="bi bi-search"></i></span>
            <input className="form-control" placeholder="Buscar por nombre, teléfono o NIT..." value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          </div>
          {!items ? (
            <Cargando />
          ) : items.length === 0 ? (
            <Vacio texto="No hay clientes registrados." />
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle mb-0">
                <thead>
                  <tr><th>Nombre</th><th>Teléfono</th><th>NIT</th><th>Direcciones</th><th></th></tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id}>
                      <td className="fw-semibold">{c.nombre}</td>
                      <td>{c.telefono || '-'}</td>
                      <td>{c.nit || '-'}</td>
                      <td><span className="badge bg-secondary">{c.direcciones}</span></td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-outline-primary me-1" onClick={() => abrir(c)}><i className="bi bi-pencil"></i></button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => eliminar(c.id)}><i className="bi bi-trash"></i></button>
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
        <Modal titulo={modal.id ? 'Editar cliente' : 'Nuevo cliente'} onClose={() => setModal(null)} onGuardar={guardar} guardando={guardando}>
          <div className="row g-3">
            <div className="col-md-12">
              <label className="form-label">Nombre *</label>
              <input className="form-control" value={form.nombre} onChange={set('nombre')} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Teléfono</label>
              <input className="form-control" value={form.telefono} onChange={set('telefono')} />
            </div>
            <div className="col-md-6">
              <label className="form-label">NIT</label>
              <input className="form-control" value={form.nit} onChange={set('nit')} placeholder="C/F o NIT" />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
