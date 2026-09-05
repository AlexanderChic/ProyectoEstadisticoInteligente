import { useEffect, useState } from 'react';
import api, { errorMsg } from '../api/client.js';
import { PageHeader, Alerta, money } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Recomendaciones() {
  const { tieneRol } = useAuth();
  const [reposicion, setReposicion] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [productos, setProductos] = useState([]);
  const [pid, setPid] = useState('');
  const [optima, setOptima] = useState(null);
  const [ia, setIa] = useState('');
  const [cargandoIa, setCargandoIa] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/recomendaciones/reposicion').then((r) => setReposicion(r.data.data)).catch(() => {});
    api.get('/dashboard/ranking?top=10').then((r) => setRanking(r.data.data)).catch(() => {});
    api.get('/productos').then((r) => setProductos(r.data.data.filter((p) => p.activo)));
  }, []);

  const calcularOptima = async () => {
    if (!pid) return;
    setError('');
    try {
      const { data } = await api.get('/recomendaciones/cantidad-optima', { params: { producto_id: pid } });
      setOptima(data.data);
    } catch (e) {
      setError(errorMsg(e));
    }
  };

  const generarIa = async () => {
    setCargandoIa(true);
    setError('');
    setIa('');
    try {
      const { data } = await api.post('/recomendaciones/ia');
      setIa(data.data.insights);
    } catch (e) {
      setError(errorMsg(e));
    } finally {
      setCargandoIa(false);
    }
  };

  return (
    <>
      <PageHeader titulo="Recomendaciones Inteligentes" subtitulo="Reposición, cantidad óptima de compra y análisis con IA" />
      <Alerta tipo="danger" onClose={() => setError('')}>{error}</Alerta>

      <div className="row g-3">
        {/* Reposición */}
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-body">
              <h6 className="card-title"><i className="bi bi-exclamation-triangle text-danger me-1"></i>Reposición de stock</h6>
              {reposicion.length === 0 ? (
                <div className="text-muted">No hay productos que requieran reposición.</div>
              ) : (
                <table className="table table-sm align-middle mb-0">
                  <thead><tr><th>Producto</th><th className="text-end">Stock</th><th className="text-end">Mínimo</th><th className="text-end">Faltante</th></tr></thead>
                  <tbody>
                    {reposicion.map((p) => (
                      <tr key={p.id}>
                        <td>{p.nombre}</td>
                        <td className="text-end"><span className="badge bg-danger">{p.stock_actual}</span></td>
                        <td className="text-end text-muted">{p.stock_minimo}</td>
                        <td className="text-end fw-semibold">{p.faltante}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Cantidad óptima */}
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-body">
              <h6 className="card-title"><i className="bi bi-calculator text-primary me-1"></i>Cantidad óptima de compra</h6>
              <div className="input-group mb-3">
                <select className="form-select" value={pid} onChange={(e) => setPid(e.target.value)}>
                  <option value="">— Seleccione producto —</option>
                  {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                <button className="btn btn-primary" onClick={calcularOptima} disabled={!pid}>Calcular</button>
              </div>
              {optima && (
                <div className="alert alert-primary mb-0">
                  <div className="fw-bold mb-1">{optima.producto}</div>
                  <div>Demanda promedio semanal: <strong>{optima.demanda_promedio_semanal}</strong></div>
                  <div>Demanda esperada ({optima.semanas_cobertura} sem.): <strong>{optima.demanda_esperada}</strong></div>
                  <div>Stock actual: <strong>{optima.stock_actual}</strong> · Tendencia: <strong>{optima.tendencia}</strong></div>
                  <hr className="my-2" />
                  <div className="fs-5">
                    Comprar: <span className="badge bg-success fs-6">{optima.cantidad_optima_compra} unidades</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ranking */}
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-body">
              <h6 className="card-title"><i className="bi bi-trophy text-warning me-1"></i>Productos más vendidos</h6>
              {ranking.length === 0 ? (
                <div className="text-muted">Sin datos de ventas.</div>
              ) : (
                <table className="table table-sm align-middle mb-0">
                  <thead><tr><th>#</th><th>Producto</th><th className="text-end">Unidades</th><th className="text-end">Ingresos</th></tr></thead>
                  <tbody>
                    {ranking.map((r, i) => (
                      <tr key={r.id}>
                        <td>{i + 1}</td>
                        <td>{r.nombre}</td>
                        <td className="text-end fw-semibold">{r.unidades}</td>
                        <td className="text-end">{money(r.ingresos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* IA */}
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-body">
              <h6 className="card-title"><i className="bi bi-robot text-info me-1"></i>Análisis inteligente (IA)</h6>
              <p className="text-muted small">
                Genera sugerencias cualitativas de negocio con inteligencia artificial (Claude), a partir de
                tus datos estadísticos. Requiere configurar la clave de API en el backend.
              </p>
              {tieneRol('Administrador', 'Propietario') ? (
                <button className="btn btn-info text-white" onClick={generarIa} disabled={cargandoIa}>
                  {cargandoIa ? 'Generando...' : 'Generar análisis con IA'}
                </button>
              ) : (
                <div className="text-muted small">Solo Administrador o Propietario pueden generar este análisis.</div>
              )}
              {ia && (
                <div className="alert alert-info mt-3 mb-0" style={{ whiteSpace: 'pre-wrap' }}>{ia}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
