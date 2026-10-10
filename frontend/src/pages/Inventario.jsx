import { useEffect, useState } from 'react';
import api, { errorMsg } from '../api/client.js';
import Modal from '../components/Modal.jsx';
import { PageHeader, Alerta, Cargando, Vacio } from '../components/ui.jsx';

export default function Inventario() {
  const [movs, setMovs] = useState(null);
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ producto_id: '', tipo: 'ENTRADA', cantidad: '', motivo: '' });
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      const { data } = await api.get('/inventario/movimientos');
      setMovs(data.data);
    } catch (e) {
      setError(errorMsg(e));
    }
  };
  useEffect(() => {
    api.get('/productos').then((r) => setProductos(r.data.data));
    cargar();
  }, []);

  const guardar = async () => {
    setGuardando(true);
    setError('');
    try {
      await api.post('/inventario/movimientos', { ...form, cantidad: Number(form.cantidad) });
      setModal(false);
      setForm({ producto_id: '', tipo: 'ENTRADA', cantidad: '', motivo: '' });
      cargar();
      api.get('/productos').then((r) => setProductos(r.data.data));
    } catch (e) {
      setError(errorMsg(e));
    } finally {
      setGuardando(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHeader titulo="Inventario" subtitulo="Entradas y salidas de stock">
        <button className="btn btn-primary" onClick={() => { setModal(true); setError(''); }}>
          <i className="bi bi-plus-lg me-1"></i>Registrar movimiento
        </button>
      </PageHeader>
      <Alerta tipo="danger" onClose={() => setError('')}>{error}</Alerta>

      <div className="card">
        <div className="card-body">
          <h6 className="card-title">Historial de movimientos</h6>
          {!movs ? (
            <Cargando />
          ) : movs.length === 0 ? (
            <Vacio texto="Sin movimientos registrados." />
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Producto</th>
                    <th>Tipo</th>
                    <th className="text-end">Cantidad</th>
                    <th className="text-end">Stock previo</th>
                    <th className="text-end">Stock nuevo</th>
                    <th>Motivo</th>
                    <th>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {movs.map((m) => (
                    <tr key={m.id}>
                      <td className="small">{new Date(m.fecha).toLocaleString('es-GT')}</td>
                      <td>{m.producto}</td>
                      <td>
                        <span className={`badge bg-${m.tipo === 'ENTRADA' ? 'success' : 'danger'}`}>
                          {m.tipo}
                        </span>
                      </td>
                      <td className="text-end">{m.cantidad}</td>
                      <td className="text-end text-muted">{m.stock_previo}</td>
                      <td className="text-end fw-semibold">{m.stock_nuevo}</td>
                      <td className="small">{m.motivo || '-'}</td>
                      <td className="small text-muted">{m.usuario || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <Modal titulo="Registrar movimiento" onClose={() => setModal(false)} onGuardar={guardar} guardando={guardando}>
          <div className="mb-3">
            <label className="form-label">Producto *</label>
            <select className="form-select" value={form.producto_id} onChange={set('producto_id')}>
              <option value="">— Seleccione —</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} (stock: {p.stock_actual})
                </option>
              ))}
            </select>
          </div>
          <div className="row g-3">
            <div className="col-6">
              <label className="form-label">Tipo *</label>
              <select className="form-select" value={form.tipo} onChange={set('tipo')}>
                <option value="ENTRADA">Entrada</option>
                <option value="SALIDA">Salida</option>
              </select>
            </div>
            <div className="col-6">
              <label className="form-label">Cantidad *</label>
              <input type="number" step="0.01" className="form-control" value={form.cantidad} onChange={set('cantidad')} />
            </div>
          </div>
          <div className="mt-3">
            <label className="form-label">Motivo</label>
            <input className="form-control" value={form.motivo} onChange={set('motivo')} placeholder="Ajuste, merma, etc." />
          </div>
        </Modal>
      )}
    </>
  );
}
