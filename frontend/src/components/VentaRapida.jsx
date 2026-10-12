import { useEffect, useRef, useState } from 'react';
import api, { errorMsg } from '../api/client.js';
import { buscarPorCodigo } from '../api/productos.js';
import { money } from './ui.jsx';

/* F2 · Venta rápida con lector de código de barras y ticket imprimible (80mm).
   Muestra campos opcionales de cliente (NIT, nombre, dirección) según la
   configuración de factura, con búsqueda de dirección por Cluster/Casa. */

const NOMBRE_NEGOCIO = 'Distribuidora de Productos de Consumo Masivo';

export default function VentaRapida({ abierto, onCerrar, onCambio }) {
  const [codigo, setCodigo] = useState('');
  const [items, setItems] = useState([]);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [factura, setFactura] = useState(null);

  // Configuración de campos opcionales de factura
  const [config, setConfig] = useState({ mostrar_nit: false, mostrar_nombre_cliente: false, mostrar_direccion: false });
  const [nit, setNit] = useState('');
  const [nombreCliente, setNombreCliente] = useState('');
  // Búsqueda de dirección
  const [dirBusqueda, setDirBusqueda] = useState('');
  const [dirOpciones, setDirOpciones] = useState([]);
  const [dirSeleccionada, setDirSeleccionada] = useState('');
  const [dirAbierto, setDirAbierto] = useState(false);
  const [dirClienteId, setDirClienteId] = useState(null);
  const [dirDireccionId, setDirDireccionId] = useState(null);
  // Búsqueda de producto por nombre (para los que no tienen código de barras)
  const [prodBusqueda, setProdBusqueda] = useState('');
  const [prodOpciones, setProdOpciones] = useState([]);

  const inputRef = useRef(null);
  const enfocar = () => setTimeout(() => inputRef.current?.focus(), 80);

  useEffect(() => {
    if (abierto) {
      setItems([]); setFactura(null); setError(''); setAviso(''); setCodigo('');
      setNit(''); setNombreCliente(''); setDirBusqueda(''); setDirSeleccionada(''); setDirOpciones([]);
      setDirClienteId(null); setDirDireccionId(null);
      api.get('/config/factura').then((r) => setConfig(r.data.data)).catch(() => {});
      enfocar();
    }
  }, [abierto]);

  // Búsqueda de direcciones (debounced)
  useEffect(() => {
    if (!config.mostrar_direccion) return;
    const t = setTimeout(async () => {
      if (dirBusqueda.trim().length < 1 || dirBusqueda === dirSeleccionada) { setDirOpciones([]); return; }
      try {
        const { data } = await api.get('/direcciones', { params: { buscar: dirBusqueda.trim() } });
        setDirOpciones(data.data.slice(0, 8));
      } catch { /* noop */ }
    }, 250);
    return () => clearTimeout(t);
  }, [dirBusqueda, dirSeleccionada, config.mostrar_direccion]);

  // Búsqueda de producto por nombre (debounced)
  useEffect(() => {
    const t = setTimeout(async () => {
      if (prodBusqueda.trim().length < 2) { setProdOpciones([]); return; }
      try {
        const { data } = await api.get('/productos', { params: { buscar: prodBusqueda.trim() } });
        setProdOpciones(data.data.filter((p) => p.activo).slice(0, 8));
      } catch { /* noop */ }
    }, 250);
    return () => clearTimeout(t);
  }, [prodBusqueda]);

  async function onScan(e) {
    e?.preventDefault();
    const cod = codigo.trim();
    if (!cod) return;
    setError(''); setAviso('');
    try {
      const prod = await buscarPorCodigo(cod);
      if (prod) agregar(prod);
      else setAviso(`Producto no encontrado: ${cod}`);
    } catch (err) {
      setError(errorMsg(err));
    } finally {
      setCodigo(''); enfocar();
    }
  }

  function agregar(prod) {
    setItems((prev) => {
      const existe = prev.find((i) => i.producto_id === prod.id);
      if (existe) return prev.map((i) => (i.producto_id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i));
      return [...prev, { producto_id: prod.id, nombre: prod.nombre, precio: Number(prod.precio_venta), cantidad: 1 }];
    });
    setAviso(`Agregado: ${prod.nombre}`);
  }

  const cambiarCantidad = (idx, val) =>
    setItems(items.map((i, k) => (k === idx ? { ...i, cantidad: Math.max(1, Number(val) || 1) } : i)));
  const quitar = (idx) => setItems(items.filter((_, k) => k !== idx));
  const total = items.reduce((a, i) => a + i.cantidad * i.precio, 0);

  function elegirProducto(p) {
    agregar(p);
    setProdBusqueda('');
    setProdOpciones([]);
    enfocar();
  }

  function elegirDireccion(d) {
    setDirSeleccionada(d.etiqueta);
    setDirBusqueda(d.etiqueta);
    setDirClienteId(d.cliente_id);
    setDirDireccionId(d.id);
    if (d.nombre_cliente) setNombreCliente(d.nombre_cliente);
    if (!nit && d.nit) setNit(d.nit); // autocompleta el NIT del cliente
    setDirAbierto(false);
    setDirOpciones([]);
  }

  async function cobrar() {
    if (items.length === 0) return setError('Agregue al menos un producto');
    setGuardando(true); setError('');
    try {
      const { data } = await api.post('/ventas', {
        items: items.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad, precio_unitario: i.precio })),
        nit: config.mostrar_nit ? nit || null : null,
        nombre_cliente: config.mostrar_nombre_cliente ? nombreCliente || null : null,
        direccion: config.mostrar_direccion ? (dirSeleccionada || dirBusqueda || null) : null,
        cliente_id: dirClienteId || null,
        direccion_id: dirDireccionId || null,
      });
      setFactura({
        id: data.id, fecha: new Date(), items: [...items], total: data.total ?? total,
        nit: config.mostrar_nit ? nit : '',
        nombre_cliente: config.mostrar_nombre_cliente ? nombreCliente : '',
        direccion: config.mostrar_direccion ? (dirSeleccionada || dirBusqueda) : '',
      });
      onCambio?.();
    } catch (err) {
      setError(errorMsg(err));
    } finally {
      setGuardando(false);
    }
  }

  function imprimirTicket() {
    const f = factura;
    const filas = f.items.map((i) =>
      `<tr><td colspan="2">${escape(i.nombre)}</td></tr>
       <tr><td>${i.cantidad} x ${i.precio.toFixed(2)}</td><td class="r">${(i.cantidad * i.precio).toFixed(2)}</td></tr>`
    ).join('');
    const cliente = [
      f.nit ? `NIT: ${escape(f.nit)}` : '',
      f.nombre_cliente ? `Cliente: ${escape(f.nombre_cliente)}` : '',
      f.direccion ? `Dir: ${escape(f.direccion)}` : '',
    ].filter(Boolean).map((l) => `<div class="small">${l}</div>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Ticket ${f.id}</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        * { box-sizing: border-box; }
        html, body { width: 80mm; }
        body { font-family: 'Courier New', monospace; width: 80mm; margin: 0; padding: 3mm; color:#000; }
        .c { text-align: center; } .r { text-align: right; }
        h1 { font-size: 13px; margin: 4px 0; }
        .small { font-size: 10px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        td { padding: 0; vertical-align: top; }
        hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
        .total { font-size: 14px; font-weight: bold; }
      </style></head><body>
        <div class="c"><h1>${escape(NOMBRE_NEGOCIO)}</h1><div class="small">Comprobante de venta</div></div>
        <hr>
        <div class="small">Factura No. ${String(f.id).padStart(6, '0')}</div>
        <div class="small">${f.fecha.toLocaleString('es-GT')}</div>
        ${cliente ? '<hr>' + cliente : ''}
        <hr>
        <table>${filas}</table>
        <hr>
        <table><tr class="total"><td>TOTAL</td><td class="r">Q ${f.total.toFixed(2)}</td></tr></table>
        <hr>
        <div class="c small">¡Gracias por su compra!</div>
      </body></html>`;
    const w = window.open('', '_blank', 'width=380,height=640');
    if (!w) { setError('El navegador bloqueó la ventana de impresión. Permita las ventanas emergentes.'); return; }
    w.document.write(html); w.document.close(); w.focus();
    w.onload = () => w.print();
    setTimeout(() => { try { w.print(); } catch { /* noop */ } }, 400);
  }

  if (!abierto) return null;

  const hayCamposCliente = config.mostrar_nit || config.mostrar_nombre_cliente || config.mostrar_direccion;

  return (
    <>
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            {!factura ? (
              <>
                <div className="modal-header">
                  <h5 className="modal-title"><i className="bi bi-cart-check me-2"></i>Venta rápida <span className="badge bg-light text-dark ms-1">F2</span></h5>
                  <button className="btn-close" onClick={onCerrar}></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={onScan}>
                    <label className="form-label fw-semibold"><i className="bi bi-upc-scan me-1"></i>Escanee el producto</label>
                    <input
                      ref={inputRef}
                      className="form-control form-control-lg"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') onScan(e); }}
                      placeholder="Esperando lectura del escáner..."
                      autoComplete="off"
                    />
                  </form>

                  {/* Búsqueda por nombre (para productos sin código de barras) */}
                  <div className="position-relative mt-2">
                    <label className="form-label small text-muted mb-1">
                      <i className="bi bi-search me-1"></i>¿Sin código de barras? Busque por nombre
                    </label>
                    <input
                      className="form-control"
                      value={prodBusqueda}
                      onChange={(e) => setProdBusqueda(e.target.value)}
                      placeholder="Ej. Pan, gaseosa..."
                    />
                    {prodOpciones.length > 0 && (
                      <ul className="list-group position-absolute w-100 shadow-sm" style={{ zIndex: 5, maxHeight: 220, overflowY: 'auto' }}>
                        {prodOpciones.map((p) => (
                          <li
                            key={p.id}
                            className="list-group-item list-group-item-action py-1 d-flex justify-content-between"
                            role="button"
                            onMouseDown={(e) => { e.preventDefault(); elegirProducto(p); }}
                          >
                            <span>{p.nombre}</span>
                            <span className="text-muted small">{money(p.precio_venta)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {aviso && <div className="text-success small mt-1">{aviso}</div>}
                  {error && <div className="alert alert-danger py-2 mt-2 mb-0">{error}</div>}

                  <table className="table table-sm align-middle mt-3">
                    <thead>
                      <tr><th>Producto</th><th className="text-center" style={{ width: 110 }}>Cantidad</th><th className="text-end">Precio</th><th className="text-end">Subtotal</th><th></th></tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr><td colSpan="5" className="text-muted text-center py-3">Escanee productos para agregarlos.</td></tr>
                      ) : (
                        items.map((i, idx) => (
                          <tr key={idx}>
                            <td>{i.nombre}</td>
                            <td className="text-center"><input type="number" min="1" className="form-control form-control-sm text-center" value={i.cantidad} onChange={(e) => cambiarCantidad(idx, e.target.value)} /></td>
                            <td className="text-end">{money(i.precio)}</td>
                            <td className="text-end fw-semibold">{money(i.cantidad * i.precio)}</td>
                            <td className="text-end"><button className="btn btn-sm btn-outline-danger" onClick={() => quitar(idx)}><i className="bi bi-x"></i></button></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* Datos de cliente (opcionales, según configuración) */}
                  {hayCamposCliente && (
                    <div className="border rounded p-3 bg-light">
                      <div className="fw-semibold mb-2 small text-uppercase text-muted">Datos del cliente</div>
                      <div className="row g-2">
                        {config.mostrar_nit && (
                          <div className="col-md-4">
                            <label className="form-label small">NIT</label>
                            <input className="form-control" value={nit} onChange={(e) => setNit(e.target.value)} placeholder="C/F o NIT" />
                          </div>
                        )}
                        {config.mostrar_nombre_cliente && (
                          <div className="col-md-4">
                            <label className="form-label small">Nombre del cliente</label>
                            <input className="form-control" value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} />
                          </div>
                        )}
                        {config.mostrar_direccion && (
                          <div className="col-md-4 position-relative">
                            <label className="form-label small">Dirección (Cluster / Casa)</label>
                            <input
                              className="form-control"
                              value={dirBusqueda}
                              onChange={(e) => { setDirBusqueda(e.target.value); setDirSeleccionada(''); setDirAbierto(true); }}
                              onFocus={() => setDirAbierto(true)}
                              placeholder="Buscar casa o cluster..."
                            />
                            {dirAbierto && dirOpciones.length > 0 && (
                              <ul className="list-group position-absolute w-100 shadow-sm" style={{ zIndex: 5, maxHeight: 200, overflowY: 'auto' }}>
                                {dirOpciones.map((d) => (
                                  <li key={d.id} className="list-group-item list-group-item-action py-1 small" role="button" onMouseDown={(e) => { e.preventDefault(); elegirDireccion(d); }}>
                                    {d.etiqueta}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer justify-content-between">
                  <div className="fs-4 fw-bold">Total: <span className="text-success">{money(total)}</span></div>
                  <div>
                    <button className="btn btn-secondary me-2" onClick={onCerrar}>Cancelar</button>
                    <button className="btn btn-success btn-lg" onClick={cobrar} disabled={guardando || items.length === 0}>
                      <i className="bi bi-cash-coin me-1"></i>{guardando ? 'Cobrando...' : 'Cobrar'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="modal-header">
                  <h5 className="modal-title"><i className="bi bi-receipt me-2"></i>Venta registrada</h5>
                  <button className="btn-close" onClick={onCerrar}></button>
                </div>
                <div className="modal-body">
                  <div className="mx-auto p-3 border" style={{ maxWidth: 300, fontFamily: 'Courier New, monospace' }}>
                    <div className="text-center fw-bold">{NOMBRE_NEGOCIO}</div>
                    <div className="text-center small text-muted">Comprobante de venta</div>
                    <hr className="my-2" />
                    <div className="small">Factura No. {String(factura.id).padStart(6, '0')}</div>
                    <div className="small">{factura.fecha.toLocaleString('es-GT')}</div>
                    {(factura.nit || factura.nombre_cliente || factura.direccion) && <hr className="my-2" />}
                    {factura.nit && <div className="small">NIT: {factura.nit}</div>}
                    {factura.nombre_cliente && <div className="small">Cliente: {factura.nombre_cliente}</div>}
                    {factura.direccion && <div className="small">Dir: {factura.direccion}</div>}
                    <hr className="my-2" />
                    {factura.items.map((i, idx) => (
                      <div key={idx} className="small mb-1">
                        <div>{i.nombre}</div>
                        <div className="d-flex justify-content-between"><span>{i.cantidad} x {i.precio.toFixed(2)}</span><span>{(i.cantidad * i.precio).toFixed(2)}</span></div>
                      </div>
                    ))}
                    <hr className="my-2" />
                    <div className="d-flex justify-content-between fw-bold"><span>TOTAL</span><span>Q {factura.total.toFixed(2)}</span></div>
                    <div className="text-center small mt-2">¡Gracias por su compra!</div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline-secondary" onClick={() => { setFactura(null); setItems([]); setNit(''); setNombreCliente(''); setDirBusqueda(''); setDirSeleccionada(''); enfocar(); }}>
                    <i className="bi bi-plus-lg me-1"></i>Nueva venta
                  </button>
                  <button className="btn btn-secondary" onClick={onCerrar}>Cerrar sin imprimir</button>
                  <button className="btn btn-primary" onClick={imprimirTicket}><i className="bi bi-printer me-1"></i>Imprimir ticket</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  );
}

function escape(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
