/** Componentes utilitarios de interfaz reutilizables. */

export function PageHeader({ titulo, subtitulo, children }) {
  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
      <div>
        <h4 className="mb-0">{titulo}</h4>
        {subtitulo && <div className="text-muted small">{subtitulo}</div>}
      </div>
      <div className="d-flex gap-2">{children}</div>
    </div>
  );
}

export function Alerta({ tipo = 'info', children, onClose }) {
  if (!children) return null;
  return (
    <div className={`alert alert-${tipo} ${onClose ? 'alert-dismissible' : ''} py-2`} role="alert">
      {children}
      {onClose && <button type="button" className="btn-close" onClick={onClose}></button>}
    </div>
  );
}

export function Cargando({ texto = 'Cargando...' }) {
  return (
    <div className="text-center text-muted py-5">
      <div className="spinner-border text-primary mb-2" role="status"></div>
      <div>{texto}</div>
    </div>
  );
}

export function Vacio({ texto = 'No hay datos para mostrar.' }) {
  return (
    <div className="text-center text-muted py-5">
      <i className="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>
      {texto}
    </div>
  );
}

export const money = (v) =>
  new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(Number(v || 0));

export const fecha = (v) => (v ? new Date(v).toLocaleDateString('es-GT') : '-');
