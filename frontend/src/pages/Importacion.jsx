import { useState } from 'react';
import api, { errorMsg } from '../api/client.js';
import { PageHeader, Alerta } from '../components/ui.jsx';

function Cargador({ titulo, ruta, columnas, campos }) {
  const [archivo, setArchivo] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const subir = async () => {
    if (!archivo) return setError('Seleccione un archivo Excel (.xlsx)');
    setCargando(true);
    setError('');
    setResultado(null);
    const fd = new FormData();
    fd.append('archivo', archivo);
    try {
      const { data } = await api.post(ruta, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResultado(data);
    } catch (e) {
      setError(errorMsg(e));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="card mb-3">
      <div className="card-body">
        <h6 className="card-title">{titulo}</h6>
        <p className="small text-muted mb-2">
          Columnas esperadas (fila 1 como encabezado): <code>{columnas}</code>
        </p>
        <div className="input-group mb-2" style={{ maxWidth: 520 }}>
          <input type="file" accept=".xlsx,.xls" className="form-control" onChange={(e) => setArchivo(e.target.files[0])} />
          <button className="btn btn-primary" onClick={subir} disabled={cargando}>
            {cargando ? 'Importando...' : 'Importar'}
          </button>
        </div>
        <Alerta tipo="danger" onClose={() => setError('')}>{error}</Alerta>
        {resultado && (
          <div className="alert alert-success">
            {campos.map((c) => resultado[c.key] != null && (
              <span key={c.key} className="me-3"><strong>{resultado[c.key]}</strong> {c.label}</span>
            ))}
            {resultado.errores?.length > 0 && (
              <details className="mt-2">
                <summary className="text-danger">{resultado.errores.length} fila(s) con error</summary>
                <ul className="small mb-0 mt-1">
                  {resultado.errores.slice(0, 20).map((er, i) => (
                    <li key={i}>Fila {er.fila}: {er.error}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Importacion() {
  return (
    <>
      <PageHeader titulo="Importar desde Excel" subtitulo="Carga masiva de inventario inicial y ventas históricas" />
      <Cargador
        titulo="Productos / Inventario inicial (HU-13)"
        ruta="/importacion/productos"
        columnas="sku, nombre, categoria, unidad, precio_compra, precio_venta, stock_actual, stock_minimo"
        campos={[
          { key: 'creados', label: 'creados' },
          { key: 'actualizados', label: 'actualizados' },
        ]}
      />
      <Cargador
        titulo="Ventas históricas (HU-16)"
        ruta="/importacion/ventas"
        columnas="fecha, sku, cantidad, precio_unitario"
        campos={[{ key: 'importadas', label: 'ventas importadas' }]}
      />
    </>
  );
}
