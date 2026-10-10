import { useEffect, useState } from 'react';
import api, { errorMsg } from '../api/client.js';
import Modal from '../components/Modal.jsx';
import { PageHeader, Alerta, Cargando, Vacio, money, fecha } from '../components/ui.jsx';

export default function Compras() {
  const [ordenes, setOrdenes] = useState(null);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [proveedor, setProveedor] = useState('');
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState({ producto_id: '', cantidad: 1, costo_unitario: '' });
  const [guardando, setGuardando] = useState(false);
  const [detalle, setDetalle] = useState(null);

  const cargar = async () => {
    try {
      const { data } = await api.get('/compras');
      setOrdenes(data.data);
    } catch (e) {
      setError(errorMsg(e));
    }
  };
  useEffect(() => {
    api.get('/proveedores').then((r) => setProveedores(r.data.data.filter((p) => p.activo)));
    api.get('/productos').then((r) => setProductos(r.data.data.filter((p) => p.activo)));
    cargar();
  }, []);

  const agregar = () => {
    if (!sel.producto_id || sel.cantidad <= 0 || !sel.costo_unitario) return;
    const p = productos.find((x) => x.id === Number(sel.producto_id));
    setItems([
      ...items,
      { producto_id: p.id, nombre: p.nombre, cantidad: Number(sel.cantidad), costo_unitario: Number(sel.costo_unitario) },
    ]);
    setSel({ producto_id: '', cantidad: 1, costo_unitario: '' });
  };

  const total = items.reduce((a, i) => a + i.cantidad * i.costo_unitario, 0);

  const guardar = async () => {
    if (!proveedor) return setError('Seleccione un proveedor');
    if (items.length === 0) return setError('Agregue al menos un producto');
    setGuardando(true);
    setError('');
    try {
      await api.post('/compras', { proveedor_id: Number(proveedor), items });
      setModal(false);
      setItems([]);
      setProveedor('');
      cargar();
    } catch (e) {
      setError(errorMsg(e));
    } finally {
      setGuardando(false);
    }
  };

  const recibir = async (id) => {
    if (!confirm('¿Marcar la orden como recibida? Esto ingresará el stock al inventario.')) return;
    try {
      await api.post(`/compras/${id}/recibir`);
      cargar();
      api.get('/productos').then((r) => setProductos(r.data.data.filter((p) => p.activo)));
    } catch (e) {
      setError(errorMsg(e));
    }
  };

  const verDetalle = async (id) => {
    const { data } = await api.get(`/compras/${id}`);
    setDetalle(data.data);
  };

  const badgeEstado = (e) =>
    e === 'RECIBIDA' ? 'success' : e === 'ANULADA' ? 'secondary' : 'warning';

  return (
    <>
      <PageHeader titulo="Compras" subtitulo="Órdenes de compra a proveedores">
        <button className="btn btn-primary" onClick={() => { setModal(true); setError(''); }}>
          <i className="bi bi-bag-plus me-1"></i>Nueva orden
        </button>
      </PageHeader>
      <Alerta tipo="danger" onClose={() => setError('')}>{error}</Alerta>

      <div className="card">
        <div className="card-body">
          {!ordenes ? (
            <Cargando />
          ) : ordenes.length === 0 ? (
            <Vacio texto="Sin órdenes de compra." />
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Fecha</th>
                    <th>Proveedor</th>
                    <th>Estado</th>
                    <th className="text-end">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {ordenes.map((o) => (
                    <tr key={o.id}>
                      <td>#{o.id}</td>
                      <td>{fecha(o.fecha)}</td>
                      <td>{o.proveedor}</td>
                      <td><span className={`badge bg-${badgeEstado(o.estado)}`}>{o.estado}</span></td>
                      <td className="text-end fw-semibold">{money(o.total)}</td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => verDetalle(o.id)}>
                          <i className="bi bi-eye"></i>
                        </button>
                        {o.estado === 'PENDIENTE' && (
                          <button className="btn btn-sm btn-outline-success" onClick={() => recibir(o.id)}>
                            <i className="bi bi-box-arrow-in-down me-1"></i>Recibir
                          </button>
                        )}
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
          titulo="Nueva orden de compra"
          onClose={() => { setModal(false); setItems([]); }}
          onGuardar={guardar}
          guardando={guardando}
          textoGuardar={`Crear orden (${money(total)})`}
          size="modal-lg"
        >
          <div className="mb-3">
            <label className="form-label">Proveedor *</label>
            <select className="form-select" value={proveedor} onChange={(e) => setProveedor(e.target.value)}>
              <option value="">— Seleccione —</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div className="row g-2 align-items-end mb-3">
            <div className="col-md-5">
              <label className="form-label">Producto</label>
              <select className="form-select" value={sel.producto_id} onChange={(e) => setSel({ ...sel, producto_id: e.target.value })}>
                <option value="">— Seleccione —</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Cantidad</label>
              <input type="number" min="1" className="form-control" value={sel.cantidad} onChange={(e) => setSel({ ...sel, cantidad: e.target.value })} />
            </div>
            <div className="col-md-2">
              <label className="form-label">Costo</label>
              <input type="number" step="0.01" className="form-control" value={sel.costo_unitario} onChange={(e) => setSel({ ...sel, costo_unitario: e.target.value })} />
            </div>
            <div className="col-md-2">
              <button className="btn btn-outline-primary w-100" onClick={agregar}>Agregar</button>
            </div>
          </div>

          {items.length > 0 && (
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="text-end">Cant.</th>
                  <th className="text-end">Costo</th>
                  <th className="text-end">Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((i, idx) => (
                  <tr key={idx}>
                    <td>{i.nombre}</td>
                    <td className="text-end">{i.cantidad}</td>
                    <td className="text-end">{money(i.costo_unitario)}</td>
                    <td className="text-end">{money(i.cantidad * i.costo_unitario)}</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-danger" onClick={() => setItems(items.filter((_, k) => k !== idx))}>
                        <i className="bi bi-x"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      )}

      {detalle && (
        <Modal titulo={`Orden #${detalle.id} · ${detalle.proveedor}`} onClose={() => setDetalle(null)}>
          <p className="mb-2">
            <strong>Fecha:</strong> {fecha(detalle.fecha)} · <strong>Estado:</strong> {detalle.estado} ·{' '}
            <strong>Total:</strong> {money(detalle.total)}
          </p>
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Producto</th>
                <th className="text-end">Cant.</th>
                <th className="text-end">Costo</th>
                <th className="text-end">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {detalle.detalle.map((d) => (
                <tr key={d.id}>
                  <td>{d.producto}</td>
                  <td className="text-end">{d.cantidad}</td>
                  <td className="text-end">{money(d.costo_unitario)}</td>
                  <td className="text-end">{money(d.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Modal>
      )}
    </>
  );
}
