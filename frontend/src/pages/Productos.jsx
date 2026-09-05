import { useEffect, useState } from 'react';
import api, { errorMsg } from '../api/client.js';
import Modal from '../components/Modal.jsx';
import { PageHeader, Alerta, Cargando, Vacio, money } from '../components/ui.jsx';

const vacio = {
  sku: '', nombre: '', categoria_id: '', unidad: 'unidad',
  precio_compra: 0, precio_venta: 0, stock_actual: 0, stock_minimo: 0,
};

export default function Productos() {
  const [items, setItems] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(vacio);
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      const { data } = await api.get('/productos', { params: { buscar: buscar || undefined } });
      setItems(data.data);
    } catch (e) {
      setError(errorMsg(e));
    }
  };

  useEffect(() => {
    api.get('/categorias').then((r) => setCategorias(r.data.data));
  }, []);
  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [buscar]);

  const abrir = (p = null) => {
    setForm(p ? { ...p, categoria_id: p.categoria_id || '' } : vacio);
    setModal(p || {});
    setError('');
  };

  const guardar = async () => {
    setGuardando(true);
    setError('');
    try {
      const payload = { ...form, categoria_id: form.categoria_id || null };
      if (modal.id) await api.put(`/productos/${modal.id}`, payload);
      else await api.post('/productos', payload);
      setModal(null);
      cargar();
    } catch (e) {
      setError(errorMsg(e));
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Desactivar este producto?')) return;
    await api.delete(`/productos/${id}`);
    cargar();
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHeader titulo="Productos" subtitulo="Catálogo e inventario base">
        <button className="btn btn-primary" onClick={() => abrir()}>
          <i className="bi bi-plus-lg me-1"></i>Nuevo producto
        </button>
      </PageHeader>
      <Alerta tipo="danger" onClose={() => setError('')}>{error}</Alerta>

      <div className="card">
        <div className="card-body">
          <div className="input-group mb-3" style={{ maxWidth: 360 }}>
            <span className="input-group-text"><i className="bi bi-search"></i></span>
            <input
              className="form-control"
              placeholder="Buscar por nombre o SKU..."
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
            />
          </div>

          {!items ? (
            <Cargando />
          ) : items.length === 0 ? (
            <Vacio texto="No hay productos. Cree el primero o importe desde Excel." />
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th className="text-end">P. Venta</th>
                    <th className="text-end">Stock</th>
                    <th className="text-end">Mínimo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id}>
                      <td className="small text-muted">{p.sku}</td>
                      <td className="fw-semibold">
                        {p.nombre}
                        {!p.activo && <span className="badge bg-secondary ms-2">Inactivo</span>}
                      </td>
                      <td>{p.categoria || '-'}</td>
                      <td className="text-end">{money(p.precio_venta)}</td>
                      <td className="text-end">
                        {p.bajo_stock ? (
                          <span className="badge bg-danger">{p.stock_actual}</span>
                        ) : (
                          p.stock_actual
                        )}
                      </td>
                      <td className="text-end text-muted">{p.stock_minimo}</td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-outline-primary me-1" onClick={() => abrir(p)}>
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => eliminar(p.id)}>
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
          titulo={modal.id ? 'Editar producto' : 'Nuevo producto'}
          onClose={() => setModal(null)}
          onGuardar={guardar}
          guardando={guardando}
          size="modal-lg"
        >
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">SKU *</label>
              <input className="form-control" value={form.sku} onChange={set('sku')} />
            </div>
            <div className="col-md-8">
              <label className="form-label">Nombre *</label>
              <input className="form-control" value={form.nombre} onChange={set('nombre')} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Categoría</label>
              <select className="form-select" value={form.categoria_id} onChange={set('categoria_id')}>
                <option value="">— Sin categoría —</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Unidad</label>
              <input className="form-control" value={form.unidad} onChange={set('unidad')} />
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
              <label className="form-label">Stock {modal.id ? 'actual' : 'inicial'}</label>
              <input type="number" step="0.01" className="form-control" value={form.stock_actual} onChange={set('stock_actual')} disabled={!!modal.id} />
              {modal.id && <div className="form-text">Use Inventario para ajustar stock.</div>}
            </div>
            <div className="col-md-3">
              <label className="form-label">Stock mínimo</label>
              <input type="number" step="0.01" className="form-control" value={form.stock_minimo} onChange={set('stock_minimo')} />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
