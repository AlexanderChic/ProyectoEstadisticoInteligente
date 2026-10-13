import { useEffect, useState } from 'react';
import api, { errorMsg } from '../api/client.js';
import Modal from '../components/Modal.jsx';
import { PageHeader, Alerta, Cargando, Vacio } from '../components/ui.jsx';

/* Pantalla combinada: Clientes y sus Direcciones.
   El cliente se guarda en la tabla clientes y cada dirección en la tabla
   direcciones (con cliente_id). En la lista se muestra teléfono, NIT y las
   direcciones de cada cliente. */
export default function Clientes() {
  const [clientes, setClientes] = useState(null);
  const [dirsPorCliente, setDirsPorCliente] = useState({});
  const [buscar, setBuscar] = useState('');
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ nombre: '', telefono: '', nit: '' });
  const [dirs, setDirs] = useState([]); // direcciones en edición: {id?, cluster, casa, referencia}
  const [dirsOriginales, setDirsOriginales] = useState([]);
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      const [c, d] = await Promise.all([
        api.get('/clientes', { params: { buscar: buscar || undefined } }),
        api.get('/direcciones'),
      ]);
      setClientes(c.data.data);
      const grupos = {};
      for (const dir of d.data.data) {
        (grupos[dir.cliente_id] = grupos[dir.cliente_id] || []).push(dir);
      }
      setDirsPorCliente(grupos);
    } catch (e) {
      setError(errorMsg(e));
    }
  };
  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
  }, [buscar]);

  const abrir = (c = null) => {
    setForm(c ? { nombre: c.nombre, telefono: c.telefono || '', nit: c.nit || '' } : { nombre: '', telefono: '', nit: '' });
    const existentes = c ? (dirsPorCliente[c.id] || []).map((d) => ({ id: d.id, cluster: d.cluster, casa: d.casa, referencia: d.referencia || '' })) : [];
    setDirs(existentes);
    setDirsOriginales(existentes);
    setModal(c || {});
    setError('');
  };

  const addDir = () => setDirs([...dirs, { cluster: '', casa: '', referencia: '' }]);
  const setDir = (i, k, v) => setDirs(dirs.map((d, idx) => (idx === i ? { ...d, [k]: v } : d)));
  const quitarDir = (i) => setDirs(dirs.filter((_, idx) => idx !== i));

  const guardar = async () => {
    if (!form.nombre) return setError('El nombre del cliente es obligatorio');
    for (const d of dirs) if (!d.cluster || !d.casa) return setError('Cada dirección requiere Cluster y Casa');
    setGuardando(true);
    setError('');
    try {
      let clienteId = modal.id;
      if (clienteId) await api.put(`/clientes/${clienteId}`, form);
      else clienteId = (await api.post('/clientes', form)).data.id;

      // Direcciones nuevas
      for (const d of dirs.filter((x) => !x.id)) {
        await api.post('/direcciones', { cliente_id: clienteId, cluster: d.cluster, casa: d.casa, referencia: d.referencia });
      }
      // Direcciones eliminadas
      const idsActuales = dirs.filter((x) => x.id).map((x) => x.id);
      for (const o of dirsOriginales) {
        if (!idsActuales.includes(o.id)) await api.delete(`/direcciones/${o.id}`);
      }
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
      <PageHeader titulo="Clientes y Direcciones" subtitulo="Cada cliente (nombre, teléfono, NIT) y sus direcciones de entrega">
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
          {!clientes ? (
            <Cargando />
          ) : clientes.length === 0 ? (
            <Vacio texto="No hay clientes registrados." />
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle mb-0">
                <thead>
                  <tr><th>Cliente</th><th>Teléfono</th><th>NIT</th><th>Direcciones</th><th></th></tr>
                </thead>
                <tbody>
                  {clientes.map((c) => (
                    <tr key={c.id}>
                      <td className="fw-semibold">{c.nombre}</td>
                      <td>{c.telefono || '-'}</td>
                      <td>{c.nit || '-'}</td>
                      <td className="small">
                        {(dirsPorCliente[c.id] || []).length === 0 ? (
                          <span className="text-muted">Sin direcciones</span>
                        ) : (
                          (dirsPorCliente[c.id] || []).map((d) => (
                            <span key={d.id} className="badge bg-light text-dark border me-1 mb-1">{d.cluster} · Casa {d.casa}</span>
                          ))
                        )}
                      </td>
                      <td className="text-end" style={{ whiteSpace: 'nowrap' }}>
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
        <Modal titulo={modal.id ? 'Editar cliente' : 'Nuevo cliente'} onClose={() => setModal(null)} onGuardar={guardar} guardando={guardando} size="modal-lg">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Nombre *</label>
              <input className="form-control" value={form.nombre} onChange={set('nombre')} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Teléfono</label>
              <input className="form-control" value={form.telefono} onChange={set('telefono')} />
            </div>
            <div className="col-md-3">
              <label className="form-label">NIT</label>
              <input className="form-control" value={form.nit} onChange={set('nit')} placeholder="C/F o NIT" />
            </div>
          </div>

          <hr className="my-3" />
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="fw-semibold"><i className="bi bi-geo-alt me-1"></i>Direcciones del cliente</span>
            <button className="btn btn-sm btn-outline-primary" onClick={addDir}><i className="bi bi-plus-lg me-1"></i>Agregar dirección</button>
          </div>
          {dirs.length === 0 ? (
            <div className="text-muted small">Este cliente aún no tiene direcciones. Puede agregar una o dejarlo sin dirección.</div>
          ) : (
            dirs.map((d, i) => (
              <div className="row g-2 mb-2 align-items-end" key={i}>
                <div className="col-md-3">
                  <label className="form-label small mb-0">Cluster</label>
                  <input className="form-control form-control-sm" value={d.cluster} onChange={(e) => setDir(i, 'cluster', e.target.value)} placeholder="Ej. Cluster 1" />
                </div>
                <div className="col-md-2">
                  <label className="form-label small mb-0">Casa</label>
                  <input className="form-control form-control-sm" value={d.casa} onChange={(e) => setDir(i, 'casa', e.target.value)} placeholder="Ej. 12" />
                </div>
                <div className="col-md-6">
                  <label className="form-label small mb-0">Referencia</label>
                  <input className="form-control form-control-sm" value={d.referencia} onChange={(e) => setDir(i, 'referencia', e.target.value)} placeholder="Portón azul, esquina..." />
                </div>
                <div className="col-md-1">
                  <button className="btn btn-sm btn-outline-danger" onClick={() => quitarDir(i)}><i className="bi bi-x"></i></button>
                </div>
              </div>
            ))
          )}
        </Modal>
      )}
    </>
  );
}
