import { useEffect, useState } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import api, { errorMsg } from '../api/client.js';
import { PALETA } from '../chartSetup.js';
import { Cargando, Alerta, money, fecha } from '../components/ui.jsx';

function Kpi({ icon, color, label, valor }) {
  return (
    <div className="col-sm-6 col-xl-3">
      <div className="card kpi-card h-100">
        <div className="card-body d-flex align-items-center gap-3">
          <div className="kpi-icon" style={{ background: `${color}20`, color }}>
            <i className={`bi ${icon}`}></i>
          </div>
          <div>
            <div className="text-muted small">{label}</div>
            <div className="kpi-value">{valor}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [ventas, setVentas] = useState(null);
  const [categorias, setCategorias] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [error, setError] = useState('');

  async function cargar() {
    try {
      const [k, v, c, a] = await Promise.all([
        api.get('/dashboard/kpis'),
        api.get('/dashboard/ventas-resumen?dias=30'),
        api.get('/dashboard/ventas-por-categoria'),
        api.get('/dashboard/alertas'),
      ]);
      setKpis(k.data.data);
      setVentas(v.data.data);
      setCategorias(c.data.data);
      setAlertas(a.data.data);
    } catch (err) {
      setError(errorMsg(err));
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function resolver(id) {
    await api.put(`/dashboard/alertas/${id}/resolver`);
    cargar();
  }

  if (error) return <Alerta tipo="danger">{error}</Alerta>;
  if (!kpis) return <Cargando />;

  const hayVentas = ventas?.etiquetas?.length > 0;
  const hayCategorias = categorias?.etiquetas?.length > 0;

  return (
    <>
      <h4 className="mb-3">Dashboard</h4>

      <div className="row g-3 mb-3">
        <Kpi icon="bi-box-seam" color="#0d6efd" label="Productos activos" valor={kpis.total_productos} />
        <Kpi icon="bi-cash-coin" color="#198754" label="Ventas del mes" valor={money(kpis.ventas_mes)} />
        <Kpi icon="bi-wallet2" color="#fd7e14" label="Valor inventario" valor={money(kpis.valor_inventario)} />
        <Kpi icon="bi-exclamation-triangle" color="#dc3545" label="Alertas activas" valor={kpis.alertas_activas} />
      </div>

      <div className="row g-3">
        <div className="col-lg-8">
          <div className="card h-100">
            <div className="card-body">
              <h6 className="card-title">Ventas de los últimos 30 días</h6>
              {hayVentas ? (
                <Line
                  data={{
                    labels: ventas.etiquetas,
                    datasets: [
                      {
                        label: 'Ventas (Q)',
                        data: ventas.totales,
                        borderColor: '#0d6efd',
                        backgroundColor: '#0d6efd22',
                        fill: true,
                        tension: 0.3,
                      },
                    ],
                  }}
                  options={{ plugins: { legend: { display: false } }, maintainAspectRatio: false }}
                  height={260}
                />
              ) : (
                <div className="text-muted text-center py-5">
                  Aún no hay ventas registradas. Registre ventas o impórtelas desde Excel.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card h-100">
            <div className="card-body">
              <h6 className="card-title">Ventas por categoría</h6>
              {hayCategorias ? (
                <Doughnut
                  data={{
                    labels: categorias.etiquetas,
                    datasets: [{ data: categorias.totales, backgroundColor: PALETA }],
                  }}
                  options={{ maintainAspectRatio: false }}
                  height={260}
                />
              ) : (
                <div className="text-muted text-center py-5">Sin datos de ventas.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-3">
        <div className="card-body">
          <h6 className="card-title">
            <i className="bi bi-bell me-1"></i>Alertas activas
          </h6>
          {alertas.length === 0 ? (
            <div className="text-muted">No hay alertas activas. Todo en orden.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Nivel</th>
                    <th>Producto</th>
                    <th>Mensaje</th>
                    <th>Fecha</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {alertas.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <span
                          className={`badge bg-${
                            a.nivel === 'CRITICO' ? 'danger' : a.nivel === 'ADVERTENCIA' ? 'warning' : 'info'
                          }`}
                        >
                          {a.nivel}
                        </span>
                      </td>
                      <td>{a.producto || '-'}</td>
                      <td className="small">{a.mensaje}</td>
                      <td className="small text-muted">{fecha(a.creado_en)}</td>
                      <td>
                        <button className="btn btn-sm btn-outline-success" onClick={() => resolver(a.id)}>
                          Resolver
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
    </>
  );
}
