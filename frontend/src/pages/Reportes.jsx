import { useState } from 'react';
import api, { errorMsg } from '../api/client.js';
import { PageHeader, Alerta } from '../components/ui.jsx';

export default function Reportes() {
  const [error, setError] = useState('');
  const [rango, setRango] = useState({ desde: '', hasta: '' });
  const [descargando, setDescargando] = useState('');

  async function descargar(ruta, nombre, params = {}) {
    setDescargando(nombre);
    setError('');
    try {
      const { data } = await api.get(ruta, { params, responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(errorMsg(e));
    } finally {
      setDescargando('');
    }
  }

  const Boton = ({ onClick, nombre, icon, texto, color = 'primary' }) => (
    <button className={`btn btn-outline-${color}`} onClick={onClick} disabled={descargando === nombre}>
      <i className={`bi ${icon} me-1`}></i>
      {descargando === nombre ? 'Generando...' : texto}
    </button>
  );

  return (
    <>
      <PageHeader titulo="Reportes" subtitulo="Exportación de datos en PDF y Excel" />
      <Alerta tipo="danger" onClose={() => setError('')}>{error}</Alerta>

      <div className="card mb-3">
        <div className="card-body">
          <h6 className="card-title">Reporte de Ventas</h6>
          <div className="row g-2 align-items-end mb-3" style={{ maxWidth: 520 }}>
            <div className="col">
              <label className="form-label small">Desde</label>
              <input type="date" className="form-control" value={rango.desde} onChange={(e) => setRango({ ...rango, desde: e.target.value })} />
            </div>
            <div className="col">
              <label className="form-label small">Hasta</label>
              <input type="date" className="form-control" value={rango.hasta} onChange={(e) => setRango({ ...rango, hasta: e.target.value })} />
            </div>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <Boton
              onClick={() => descargar('/reportes/ventas/pdf', 'reporte_ventas.pdf', { desde: rango.desde || undefined, hasta: rango.hasta || undefined })}
              nombre="reporte_ventas.pdf" icon="bi-file-earmark-pdf" texto="Ventas (PDF)" color="danger"
            />
            <Boton
              onClick={() => descargar('/reportes/ventas/excel', 'reporte_ventas.xlsx', { desde: rango.desde || undefined, hasta: rango.hasta || undefined })}
              nombre="reporte_ventas.xlsx" icon="bi-file-earmark-excel" texto="Ventas (Excel)" color="success"
            />
          </div>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <h6 className="card-title">Reporte de Inventario</h6>
          <div className="d-flex gap-2 flex-wrap">
            <Boton onClick={() => descargar('/reportes/inventario/pdf', 'reporte_inventario.pdf')} nombre="reporte_inventario.pdf" icon="bi-file-earmark-pdf" texto="Inventario (PDF)" color="danger" />
            <Boton onClick={() => descargar('/reportes/inventario/excel', 'reporte_inventario.xlsx')} nombre="reporte_inventario.xlsx" icon="bi-file-earmark-excel" texto="Inventario (Excel)" color="success" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h6 className="card-title">Reporte Estadístico</h6>
          <p className="text-muted small">Productos más vendidos, tendencias y proyecciones.</p>
          <Boton onClick={() => descargar('/reportes/estadistico/pdf', 'reporte_estadistico.pdf')} nombre="reporte_estadistico.pdf" icon="bi-file-earmark-pdf" texto="Estadístico (PDF)" color="danger" />
        </div>
      </div>
    </>
  );
}
