import { useEffect, useRef, useState } from 'react';
import api, { errorMsg } from '../api/client.js';
import { buscarPorCodigo } from '../api/productos.js';
import { money } from './ui.jsx';

/* F1 · Ver precio: escanea un producto y muestra su precio. */
export default function ModalVerPrecio({ abierto, onCerrar }) {
  const [codigo, setCodigo] = useState('');
  const [producto, setProducto] = useState(null);
  const [aviso, setAviso] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (abierto) {
      setCodigo('');
      setProducto(null);
      setAviso('');
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [abierto]);

  async function onScan(e) {
    e?.preventDefault();
    const cod = codigo.trim();
    if (!cod) return;
    setAviso('');
    const prod = await buscarPorCodigo(cod);
    if (prod) setProducto(prod);
    else setAviso(`Producto no encontrado: ${cod}`);
    setCodigo('');
    setTimeout(() => inputRef.current?.focus(), 60);
  }

  function otro() {
    setProducto(null);
    setCodigo('');
    setTimeout(() => inputRef.current?.focus(), 60);
  }

  if (!abierto) return null;

  return (
    <>
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title"><i className="bi bi-tag me-2"></i>Consultar precio <span className="badge bg-light text-dark ms-1">F1</span></h5>
              <button className="btn-close" onClick={onCerrar}></button>
            </div>
            <div className="modal-body">
              {!producto ? (
                <form onSubmit={onScan}>
                  <label className="form-label fw-semibold">
                    <i className="bi bi-upc-scan me-1"></i>Escanee el producto
                  </label>
                  <input
                    ref={inputRef}
                    className="form-control form-control-lg"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') onScan(e); }}
                    placeholder="Esperando lectura del escáner..."
                    autoComplete="off"
                  />
                  {aviso && <div className="text-danger small mt-2">{aviso}</div>}
                </form>
              ) : (
                <div className="text-center py-2">
                  <div className="fw-bold fs-4">{producto.nombre}</div>
                  <div className="text-muted small mb-3">SKU: {producto.sku} · Stock: {producto.stock_actual}</div>
                  <div className="text-muted">Precio de venta</div>
                  <div className="display-4 fw-bold text-success">{money(producto.precio_venta)}</div>
                  <div className="text-muted small mt-2">Precio de compra: {money(producto.precio_compra)}</div>
                  <button className="btn btn-outline-primary mt-3" onClick={otro}>
                    <i className="bi bi-upc-scan me-1"></i>Escanear otro
                  </button>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onCerrar}>Cerrar</button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  );
}
