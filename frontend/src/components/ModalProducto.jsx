import { useEffect, useRef, useState } from 'react';
import api, { errorMsg } from '../api/client.js';
import { buscarPorCodigo } from '../api/productos.js';
import { money } from './ui.jsx';

/* F3 · Agregar / Actualizar producto por escaneo.
   - Fase 'scan': campo de escaneo enfocado.
   - Fase 'editar' (producto existe): muestra precio y permite actualizar
     precio de compra, precio de venta y stock actual (inventario).
   - Fase 'nuevo' (no existe): ofrece registrarlo con precios y stock. */
export default function ModalProducto({ abierto, onCerrar, onCambio }) {
  const [fase, setFase] = useState('scan'); // 'scan' | 'editar' | 'nuevo'
  const [codigo, setCodigo] = useState('');
  const [producto, setProducto] = useState(null);
  const [form, setForm] = useState({});
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const scanRef = useRef(null);

  const focoScan = () => setTimeout(() => scanRef.current?.focus(), 80);

  useEffect(() => {
    if (abierto) {
      setFase('scan');
      setCodigo('');
      setProducto(null);
      setAviso('');
      setError('');
      focoScan();
      api.get('/categorias').then((r) => setCategorias(r.data.data)).catch(() => {});
    }
  }, [abierto]);

  async function onScan(e) {
    e?.preventDefault();
    const cod = codigo.trim();
    if (!cod) return;
    setAviso('');
    setError('');
    try {
      const prod = await buscarPorCodigo(cod);
      if (prod) {
        setProducto(prod);
        setForm({
          precio_compra: prod.precio_compra,
          precio_venta: prod.precio_venta,
          stock_actual: prod.stock_actual,
        });
        setFase('editar');
      } else {
        setProducto(null);
        setForm({
          sku: cod,
          codigo_barras: cod,
          nombre: '',
          categoria_id: '',
          precio_compra: 0,
          precio_venta: 0,
          stock_actual: 0,
          stock_minimo: 0,
        });
        setFase('nuevo');
      }
    } catch (err) {
      setError(errorMsg(err));
      setCodigo('');
      focoScan();
    }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function actualizar() {
    setGuardando(true);
    setError('');
    try {
      await api.post(`/productos/${producto.id}/ajuste`, {
        precio_compra: Number(form.precio_compra),
        precio_venta: Number(form.precio_venta),
        stock_actual: Number(form.stock_actual),
      });
      setAviso(`Actualizado: ${producto.nombre}`);
      onCambio?.();
      volverAScan();
    } catch (err) {
      setError(errorMsg(err));
    } finally {
      setGuardando(false);
    }
  }

  async function agregar() {
    if (!form.nombre || !form.sku) return setError('SKU y nombre son obligatorios');
    setGuardando(true);
    setError('');
    try {
      await api.post('/productos', form);
      setAviso(`Producto agregado: ${form.nombre}`);
      onCambio?.();
      volverAScan();
    } catch (err) {
      setError(errorMsg(err));
    } finally {
      setGuardando(false);
    }
  }

  function volverAScan() {
    setFase('scan');
    setCodigo('');
    setProducto(null);
    focoScan();
  }

  if (!abierto) return null;

  return (
    <>
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="bi bi-box-seam me-2"></i>Agregar / Actualizar producto
                <span className="badge bg-light text-dark ms-1">F3</span>
              </h5>
              <button className="btn-close" onClick={onCerrar}></button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger py-2">{error}</div>}
              {aviso && <div className="alert alert-success py-2">{aviso}</div>}

              {/* ---- Fase escaneo ---- */}
              {fase === 'scan' && (
                <form onSubmit={onScan}>
                  <label className="form-label fw-semibold">
                    <i className="bi bi-upc-scan me-1"></i>Escanee el producto
                  </label>
                  <input
                    ref={scanRef}
                    className="form-control form-control-lg"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') onScan(e); }}
                    placeholder="Esperando lectura del escáner..."
                    autoComplete="off"
                  />
                  <div className="form-text">
                    Si el producto existe podrá actualizar sus precios y stock; si no, podrá agregarlo.
                  </div>
                </form>
              )}

              {/* ---- Fase editar (existe) ---- */}
              {fase === 'editar' && producto && (
                <div>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <div className="fw-bold fs-4">{producto.nombre}</div>
                      <div className="text-muted small">SKU: {producto.sku} · Código: {producto.codigo_barras || '—'}</div>
                    </div>
                    <div className="text-end">
                      <div className="text-muted small">Precio de venta</div>
                      <div className="fs-3 fw-bold text-success">{money(form.precio_venta)}</div>
                    </div>
                  </div>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Precio de compra</label>
                      <input type="number" step="0.01" className="form-control" value={form.precio_compra} onChange={set('precio_compra')} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Precio de venta</label>
                      <input type="number" step="0.01" className="form-control" value={form.precio_venta} onChange={set('precio_venta')} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Inventario actual (stock)</label>
                      <input type="number" step="0.01" className="form-control" value={form.stock_actual} onChange={set('stock_actual')} />
                    </div>
                  </div>
                  <div className="d-flex gap-2 mt-3">
                    <button className="btn btn-primary" onClick={actualizar} disabled={guardando}>
                      <i className="bi bi-check2 me-1"></i>{guardando ? 'Guardando...' : 'Actualizar'}
                    </button>
                    <button className="btn btn-outline-secondary" onClick={volverAScan}>Escanear otro</button>
                  </div>
                </div>
              )}

              {/* ---- Fase nuevo (no existe) ---- */}
              {fase === 'nuevo' && (
                <div>
                  <div className="alert alert-warning py-2">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    Producto no agregado. ¿Desea agregarlo?
                  </div>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Código de barras</label>
                      <input className="form-control" value={form.codigo_barras} onChange={set('codigo_barras')} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">SKU *</label>
                      <input className="form-control" value={form.sku} onChange={set('sku')} />
                    </div>
                    <div className="col-md-8">
                      <label className="form-label">Nombre del producto *</label>
                      <input className="form-control" value={form.nombre} onChange={set('nombre')} autoFocus />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Categoría</label>
                      <select className="form-select" value={form.categoria_id} onChange={set('categoria_id')}>
                        <option value="">— Sin categoría —</option>
                        {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Precio compra</label>
                      <input type="number" step="0.01" className="form-control" value={form.precio_compra} onChange={set('precio_compra')} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Precio venta</label>
                      <input type="number" step="0.01" className="form-control" value={form.precio_venta} onChange={set('precio_venta')} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Stock inicial</label>
                      <input type="number" step="0.01" className="form-control" value={form.stock_actual} onChange={set('stock_actual')} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Stock mínimo</label>
                      <input type="number" step="0.01" className="form-control" value={form.stock_minimo} onChange={set('stock_minimo')} />
                    </div>
                  </div>
                  <div className="d-flex gap-2 mt-3">
                    <button className="btn btn-success" onClick={agregar} disabled={guardando}>
                      <i className="bi bi-plus-lg me-1"></i>{guardando ? 'Guardando...' : 'Agregar producto'}
                    </button>
                    <button className="btn btn-outline-secondary" onClick={volverAScan}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  );
}
