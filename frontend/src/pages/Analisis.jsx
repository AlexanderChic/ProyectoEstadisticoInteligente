import { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import api, { errorMsg } from '../api/client.js';
import { PageHeader, Alerta, Vacio } from '../components/ui.jsx';

export default function Analisis() {
  const [productos, setProductos] = useState([]);
  const [pid, setPid] = useState('');
  const [ventana, setVentana] = useState(3);
  const [periodos, setPeriodos] = useState(4);
  const [pm, setPm] = useState(null);
  const [tendencia, setTendencia] = useState(null);
  const [descriptiva, setDescriptiva] = useState(null);
  const [proyeccion, setProyeccion] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    api.get('/productos').then((r) => setProductos(r.data.data.filter((p) => p.activo)));
  }, []);

  async function analizar() {
    if (!pid) return;
    setCargando(true);
    setError('');
    try {
      const [a, b, c, d] = await Promise.all([
        api.get('/analitica/promedios-moviles', { params: { producto_id: pid, ventana } }),
        api.get('/analitica/tendencias', { params: { producto_id: pid } }),
        api.get('/analitica/descriptiva', { params: { producto_id: pid } }),
        api.get('/analitica/proyeccion', { params: { producto_id: pid, periodos } }),
      ]);
      setPm(a.data.data);
      setTendencia(b.data.data);
      setDescriptiva(c.data.data);
      setProyeccion(d.data.data);
    } catch (e) {
      setError(errorMsg(e));
    } finally {
      setCargando(false);
    }
  }

  const hayDatos = pm && pm.ventas.length > 0;

  return (
    <>
      <PageHeader titulo="Análisis Estadístico" subtitulo="Promedios móviles, tendencias y proyección de demanda" />
      <Alerta tipo="danger" onClose={() => setError('')}>{error}</Alerta>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-md-5">
              <label className="form-label">Producto</label>
              <select className="form-select" value={pid} onChange={(e) => setPid(e.target.value)}>
                <option value="">— Seleccione un producto —</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Ventana (PM)</label>
              <input type="number" min="2" className="form-control" value={ventana} onChange={(e) => setVentana(e.target.value)} />
            </div>
            <div className="col-md-2">
              <label className="form-label">Proyectar (sem.)</label>
              <input type="number" min="1" className="form-control" value={periodos} onChange={(e) => setPeriodos(e.target.value)} />
            </div>
            <div className="col-md-3">
              <button className="btn btn-primary w-100" onClick={analizar} disabled={!pid || cargando}>
                {cargando ? 'Analizando...' : 'Analizar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {!pm ? (
        <Vacio texto="Seleccione un producto y presione Analizar." />
      ) : !hayDatos ? (
        <Vacio texto="Este producto no tiene ventas registradas para analizar." />
      ) : (
        <>
          <div className="row g-3">
            <div className="col-lg-8">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="card-title">Ventas semanales y promedio móvil (ventana {pm.ventana})</h6>
                  <Line
                    data={{
                      labels: pm.etiquetas,
                      datasets: [
                        { label: 'Ventas', data: pm.ventas, borderColor: '#0d6efd', backgroundColor: '#0d6efd22', tension: 0.3 },
                        { label: `Promedio móvil (${pm.ventana})`, data: pm.promedioMovil, borderColor: '#fd7e14', borderDash: [6, 4], tension: 0.3 },
                      ],
                    }}
                    options={{ maintainAspectRatio: false }}
                    height={280}
                  />
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="card-title">Tendencia</h6>
                  {tendencia && (
                    <>
                      <div className="display-6 text-capitalize">
                        <i className={`bi bi-arrow-${
                          tendencia.direccion === 'creciente' ? 'up-right text-success' :
                          tendencia.direccion === 'decreciente' ? 'down-right text-danger' : 'right text-secondary'
                        }`}></i>{' '}
                        {tendencia.direccion}
                      </div>
                      <ul className="list-unstyled small mt-2 mb-0">
                        <li><strong>Pendiente:</strong> {tendencia.pendiente} unidades/semana</li>
                        <li><strong>R² (ajuste):</strong> {tendencia.r2}</li>
                      </ul>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3 mt-0">
            <div className="col-lg-8">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="card-title">Proyección de demanda ({periodos} semanas)</h6>
                  <Bar
                    data={{
                      labels: [
                        ...proyeccion.etiquetas.map((_, i) => `S${i + 1}`),
                        ...proyeccion.proyeccion.map((_, i) => `P${i + 1}`),
                      ],
                      datasets: [
                        {
                          label: 'Histórico',
                          data: [...proyeccion.historico, ...proyeccion.proyeccion.map(() => null)],
                          backgroundColor: '#0d6efd',
                        },
                        {
                          label: 'Proyección',
                          data: [...proyeccion.historico.map(() => null), ...proyeccion.proyeccion],
                          backgroundColor: '#20c997',
                        },
                      ],
                    }}
                    options={{ maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } } }}
                    height={280}
                  />
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="card-title">Estadística descriptiva</h6>
                  {descriptiva && (
                    <table className="table table-sm mb-0">
                      <tbody>
                        <tr><td>Observaciones</td><td className="text-end fw-semibold">{descriptiva.n}</td></tr>
                        <tr><td>Media</td><td className="text-end fw-semibold">{descriptiva.media}</td></tr>
                        <tr><td>Mediana</td><td className="text-end fw-semibold">{descriptiva.mediana}</td></tr>
                        <tr><td>Desv. estándar</td><td className="text-end fw-semibold">{descriptiva.desviacionEstandar}</td></tr>
                        <tr><td>Coef. variación</td><td className="text-end fw-semibold">{descriptiva.coefVariacion}%</td></tr>
                        <tr><td>Mínimo / Máximo</td><td className="text-end fw-semibold">{descriptiva.minimo} / {descriptiva.maximo}</td></tr>
                        <tr><td>Percentil 25 / 75</td><td className="text-end fw-semibold">{descriptiva.percentil25} / {descriptiva.percentil75}</td></tr>
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
