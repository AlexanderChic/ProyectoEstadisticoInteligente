import { PageHeader } from '../components/ui.jsx';
import { useAcciones } from '../context/AccionesContext.jsx';

/* Página de Ingreso Rápido: lanzador de las acciones por escáner.
   Las modales (con el campo de escaneo) viven en AccionesProvider y también se
   abren con las teclas F1 / F2 / F3 desde cualquier pantalla. */
export default function Escaner() {
  const { abrir } = useAcciones();

  const tarjetas = [
    { id: 'precio', icon: 'bi-tag', color: '#0d6efd', tecla: 'F1', titulo: 'Ver precio', desc: 'Escanee un producto y vea su precio de venta al instante.' },
    { id: 'venta', icon: 'bi-cart-check', color: '#198754', tecla: 'F2', titulo: 'Venta rápida', desc: 'Escanee varios productos, cobre y genere el ticket imprimible.' },
    { id: 'producto', icon: 'bi-box-seam', color: '#6f42c1', tecla: 'F3', titulo: 'Agregar / Actualizar', desc: 'Escanee para agregar un producto nuevo o actualizar precios y stock.' },
  ];

  return (
    <>
      <PageHeader
        titulo="Ingreso Rápido / Escáner"
        subtitulo="Use el lector de código de barras. También funciona con las teclas F1, F2 y F3 en cualquier pantalla."
      />
      <div className="row g-3">
        {tarjetas.map((t) => (
          <div className="col-md-4" key={t.id}>
            <div
              className="card h-100 text-center"
              role="button"
              onClick={() => abrir(t.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-body py-4">
                <div
                  className="d-inline-flex align-items-center justify-content-center mb-3"
                  style={{ width: 64, height: 64, borderRadius: 16, background: `${t.color}20`, color: t.color, fontSize: 28 }}
                >
                  <i className={`bi ${t.icon}`}></i>
                </div>
                <h5 className="mb-1">{t.titulo}</h5>
                <span className="badge bg-secondary mb-2">{t.tecla}</span>
                <p className="text-muted small mb-0">{t.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="alert alert-info mt-3 mb-0">
        <i className="bi bi-info-circle me-1"></i>
        Consejo: conecte el lector USB y presione <strong>F1</strong>, <strong>F2</strong> o <strong>F3</strong>;
        se abrirá la ventana correspondiente con el cursor listo para escanear.
      </div>
    </>
  );
}
