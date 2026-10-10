import { useEffect, useState } from 'react';
import api, { errorMsg } from '../api/client.js';
import { PageHeader, Alerta, Cargando } from '../components/ui.jsx';

/* Configuración de factura (solo Administrador): activa/desactiva los campos
   opcionales que se muestran al cobrar una venta. */
export default function ConfiguracionFactura() {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.get('/config/factura').then((r) => setConfig(r.data.data)).catch((e) => setError(errorMsg(e)));
  }, []);

  const toggle = (k) => setConfig({ ...config, [k]: !config[k] });

  async function guardar() {
    setGuardando(true);
    setError('');
    setOk('');
    try {
      await api.put('/config/factura', config);
      setOk('Configuración guardada. Los cambios se aplican en la próxima venta.');
    } catch (e) {
      setError(errorMsg(e));
    } finally {
      setGuardando(false);
    }
  }

  if (!config) return <Cargando />;

  const campos = [
    { key: 'mostrar_nit', titulo: 'NIT', desc: 'Solicitar el NIT del cliente al cobrar (C/F si no aplica).' },
    { key: 'mostrar_nombre_cliente', titulo: 'Nombre del cliente', desc: 'Solicitar el nombre del cliente al cobrar.' },
    { key: 'mostrar_direccion', titulo: 'Dirección del cliente', desc: 'Permitir buscar y asignar la dirección (Cluster / Casa) al cobrar.' },
  ];

  return (
    <>
      <PageHeader titulo="Configuración de Factura" subtitulo="Active los campos que se pedirán al cobrar una venta">
        <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
          <i className="bi bi-check2 me-1"></i>{guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </PageHeader>
      <Alerta tipo="danger" onClose={() => setError('')}>{error}</Alerta>
      <Alerta tipo="success" onClose={() => setOk('')}>{ok}</Alerta>

      <div className="card">
        <div className="card-body">
          <p className="text-muted">
            Estos campos ya están programados en el sistema; aquí solo decide cuáles se muestran
            al momento de cobrar. Actívelos o desactívelos según lo necesite su negocio.
          </p>
          <div className="list-group">
            {campos.map((c) => (
              <label key={c.key} className="list-group-item d-flex justify-content-between align-items-center" role="button">
                <div>
                  <div className="fw-semibold">{c.titulo}</div>
                  <div className="text-muted small">{c.desc}</div>
                </div>
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" checked={config[c.key]} onChange={() => toggle(c.key)} style={{ transform: 'scale(1.3)' }} />
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
