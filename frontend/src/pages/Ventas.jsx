import { useEffect, useState } from 'react';
import api, { errorMsg } from '../api/client.js';
import Modal from '../components/Modal.jsx';
import { PageHeader, Alerta, Cargando, Vacio, money, fecha } from '../components/ui.jsx';

export default function Ventas() {
  const [ventas, setVentas] = useState(null);
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState({ producto_id: '', cantidad: 1 });
  const [guardando, setGuardando] = useState(false);
  const [detalle, setDetalle] = useState(null);

  const cargar = async () => {
    try {
      const { data } = await api.get('/ventas');
      setVentas(data.data);
    } catch (e) {
      setError(errorMsg(e));
    }
  };
  useEffect(() => {
    api.get('/productos').then((r) => setProductos(r.data.data.filter((p) => p.activo)));
    cargar();
  }, []);

  const agregar = () => {
    if (!sel.producto_id || sel.cantidad <= 0) return;
    const p = productos.find((x) => x.id === Number(sel.producto_id));
    if (items.some((i) => i.producto_id === p.id)) return;
    setItems([
      ...items,
      { producto_id: p.id, nombre: p.nombre, cantidad: Number(sel.cantidad), precio_unitario: Number(p.precio_venta) },
    ]);
    setSel({ producto_id: '', cantidad: 1 });
  };

  const total = items.reduce((a, i) => a + i.cantidad * i.precio_unitario, 0);

  const guardar = async () => {
    if (items.length === 0) {
      setError('Agregue al menos un producto');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      await api.post('/ventas', { items });
      setModal(false);
      setItems([]);
      cargar();
      api.get('/productos').then((r) => setProductos(r.data.data.filter((p) => p.activo)));
    } catch (e) {
      setError(errorMsg(e));
    } finally {
      setGuardando(false);
    }
  };

  const verDetalle = async (id) => {
    const { data } = await api.get(`/ventas/${id}`);
    setDetalle(data.data);
  };

  return (
    <>
      <PageHeader titulo="Ventas" subtitulo="Registro y consulta de ventas">
        <button className="btn btn-primary" onClick={() => { setModal(true); setError(''); }}>
          <i className="bi bi-cart-plus me-1"></i>Nueva venta
        </button>
      </PageHeader>
      <Alerta tipo="danger" onClose={() => setError('')}>{error}</Alerta>

      <div className="card">
        <div className="card-body">
          {!ventas ? (
            <Cargando />
          ) : ventas.length === 0 ? (
            <Vacio texto="Sin ventas registradas." />
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Fecha</th>
                    <th>Líneas</th>
                    <th className="text-end">Total</th>
                    <th>Usuario</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.map((v) => (
                    <tr key={v.id}>
                      <td>#{v.id}</td>
                      <td>{fecha(v.fecha)}</td>
                      <td>{v.lineas}</td>
                      <td className="text-end fw-semibold">{money(v.total)}</td>
                      <td className="small text-muted">{v.usuario || '-'}</td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => verDetalle(v.id)}>
                          <i className="bi bi-eye"></i> Ver
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
          titulo="Nueva venta"
          onClose={() => { setModal(false); setItems([]); }}
          onGuardar={guardar}
          guardando={guardando}
          textoGuardar={`Registrar venta (${money(total)})`}
          size="modal-lg"
        >
          <div className="row g-2 align-items-end mb-3">
            <div className="col-md-6">
              <label className="form-label">Producto</label>
              <select
                className="form-select"
                value={sel.producto_id}
                onChange={(e) => setSel({ ...sel, producto_id: e.target.value })}
              >
                <option value="">— Seleccione —</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} · {money(p.precio_venta)} (stock: {p.stock_actual})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Cantidad</label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={sel.cantidad}
                onChange={(e) => setSel({ ...sel, cantidad: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <button className="btn btn-outline-primary w-100" onClick={agregar}>
                <i className="bi bi-plus-lg"></i> Agregar
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="text-muted text-center py-3">Agregue productos a la venta.</div>
          ) : (
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="text-end">Cantidad</th>
                  <th className="text-end">Precio</th>
                  <th className="text-end">Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((i, idx) => (
                  <tr key={idx}>
                    <td>{i.nombre}</td>
                    <td className="text-end">{i.cantidad}</td>
                    <td className="text-end">{money(i.precio_unitario)}</td>
                    <td className="text-end">{money(i.cantidad * i.precio_unitario)}</td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => setItems(items.filter((_, k) => k !== idx))}
                      >
                        <i className="bi bi-x"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan="3" className="text-end">Total</th>
                  <th className="text-end">{money(total)}</th>
                  <th></th>
                </tr>
              </tfoot>
            </table>
          )}
        </Modal>
      )}

      {detalle && (
        <Modal titulo={`Venta #${detalle.id}`} onClose={() => setDetalle(null)}>
          <p className="mb-2">
            <strong>Fecha:</strong> {fecha(detalle.fecha)} · <strong>Total:</strong> {money(detalle.total)}
          </p>
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Producto</th>
                <th className="text-end">Cant.</th>
                <th className="text-end">Precio</th>
                <th className="text-end">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {detalle.detalle.map((d) => (
                <tr key={d.id}>
                  <td>{d.producto}</td>
                  <td className="text-end">{d.cantidad}</td>
                  <td className="text-end">{money(d.precio_unitario)}</td>
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
