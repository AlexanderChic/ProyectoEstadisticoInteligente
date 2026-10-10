import { useAcciones } from '../context/AccionesContext.jsx';

/* Botones de acciones rápidas en la barra superior. Los atajos F1/F2/F3 y las
   modales viven en AccionesProvider. */
export default function BarraAcciones() {
  const { abrir } = useAcciones();
  return (
    <div className="btn-group btn-group-sm">
      <button className="btn btn-outline-primary" onClick={() => abrir('precio')} title="Ver precio (F1)">
        <i className="bi bi-tag me-1"></i>Precio <span className="badge bg-light text-dark ms-1">F1</span>
      </button>
      <button className="btn btn-success" onClick={() => abrir('venta')} title="Venta rápida (F2)">
        <i className="bi bi-cart-plus me-1"></i>Venta <span className="badge bg-light text-dark ms-1">F2</span>
      </button>
      <button className="btn btn-outline-primary" onClick={() => abrir('producto')} title="Agregar/actualizar producto (F3)">
        <i className="bi bi-box-seam me-1"></i>Producto <span className="badge bg-light text-dark ms-1">F3</span>
      </button>
    </div>
  );
}
