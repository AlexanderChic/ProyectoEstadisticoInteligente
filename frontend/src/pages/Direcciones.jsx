import { useEffect, useState } from 'react';
import api, { errorMsg } from '../api/client.js';
import Modal from '../components/Modal.jsx';
import { PageHeader, Alerta, Cargando, Vacio } from '../components/ui.jsx';

/* Catálogo de direcciones (Cluster / Casa). Cada dirección pertenece a un cliente. */
const vacio = { cliente_id: '', cluster: '', casa: '', referencia: '' };

export default function Direcciones() {
  const [items, setItems] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(vacio);
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      const { data } = await api.get('/direcciones', { params: { buscar: buscar || undefined } });
      setItems(data.data);
    } catch (e) {
      setError(errorMsg(e));
    }
  };
  useEffect(() => {
    api.get('/clientes').then((r) => setClientes(r.data.data)).catch(() => {});
  }, []);
  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
  }, [buscar]);

  const abrir = (d = null) => {
    setForm(d ? { cliente_id: d.cliente_id, cluster: d.cluster, casa: d.casa, referencia: d.referencia || '' } : vacio);
    setModal(d || {});
    setError('');
    api.get('/clientes').then((r) => setClientes(r.data.data)).catch(() => {});
  };

  const guardar = async () => {
    if (!form.cliente_id) return setError('Seleccione el cliente dueño de la dirección');
    setGuardando(true);
    setError('');
    try {
      if (modal.id) await api.put(`/direcciones/${modal.id}`, form);
      else await api.post('/direcciones', form);
      setModal(null);
      cargar();
    } catch (e) {
      setError(errorMsg(e));
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar esta dirección?')) return;
    await api.delete(`/direcciones/${id}`);
    cargar();
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHeader titulo="Direcciones" subtitulo="Clusters y casas asociados a cada cliente">
        <button className="btn btn-primary" onClick={() => abrir()}>
          <i className="bi bi-plus-lg me-1"></i>Nueva dirección
        </button>
      </PageHeader>
      <Alerta tipo="danger" onClose={() => setError('')}>{error}</Alerta>

      <div className="card">
        <div className="card-body">
          <div className="input-group mb-3" style={{ maxWidth: 360 }}>
            <span className="input-group-text"><i className="bi bi-search"></i></span>
            <input className="form-control" placeholder="Buscar cluster, casa o cliente..." value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          </div>
          {!items ? (
            <Cargando />
          ) : items.length === 0 ? (
            <Vacio texto="No hay direcciones registradas." />
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle mb-0">
                <thead>
                  <tr><th>Cliente</th><th>Cluster</th><th>Casa</th><th>Referencia</th><th></th></tr>
                </thead>
                <tbody>
                  {items.map((d) => (
                    <tr key={d.id}>
                      <td className="fw-semibold">{d.nombre_cliente}</td>
                      <td>{d.cluster}</td>
                      <td>{d.casa}</td>
                      <td className="small text-muted">{d.referencia || '-'}</td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-outline-primary me-1" onClick={() => abrir(d)}><i className="bi bi-pencil"></i></button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => eliminar(d.id)}><i className="bi bi-trash"></i></button>
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
        <Modal titulo={modal.id ? 'Editar dirección' : 'Nueva dirección'} onClose={() => setModal(null)} onGuardar={guardar} guardando={guardando}>
          <div className="row g-3">
            <div className="col-md-12">
              <label className="form-label">Cliente *</label>
              <select className="form-select" value={form.cliente_id} onChange={set('cliente_id')}>
                <option value="">— Seleccione el cliente —</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.telefono ? ` · ${c.telefono}` : ''}</option>)}
              </select>
              <div className="form-text">Los clientes se administran en la pantalla "Clientes".</div>
            </div>
            <div className="col-md-6">
              <label className="form-label">Cluster *</label>
              <input className="form-control" value={form.cluster} onChange={set('cluster')} placeholder="Ej. Cluster 1" />
            </div>
            <div className="col-md-6">
              <label className="form-label">Casa *</label>
              <input className="form-control" value={form.casa} onChange={set('casa')} placeholder="Ej. 12" />
            </div>
            <div className="col-md-12">
              <label className="form-label">Referencia</label>
              <input className="form-control" value={form.referencia} onChange={set('referencia')} placeholder="Ej. Portón azul, esquina" />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
