import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import BarraAcciones from './BarraAcciones.jsx';
import { AccionesProvider } from '../context/AccionesContext.jsx';

const TODOS = ['Administrador', 'Propietario', 'Empleado'];
const GESTION = ['Administrador', 'Propietario']; // análisis, reportes (no Empleado)

const enlaces = [
  { seccion: 'Principal' },
  { to: '/', icon: 'bi-speedometer2', texto: 'Dashboard', end: true, roles: TODOS },
  { seccion: 'Operación', roles: TODOS },
  { to: '/escaner', icon: 'bi-upc-scan', texto: 'Ingreso Rápido / Escáner', roles: TODOS },
  { to: '/productos', icon: 'bi-box-seam', texto: 'Productos', roles: TODOS },
  { to: '/categorias', icon: 'bi-tags', texto: 'Categorías', roles: TODOS },
  { to: '/inventario', icon: 'bi-clipboard-data', texto: 'Inventario', roles: TODOS },
  { to: '/ventas', icon: 'bi-cart-check', texto: 'Ventas', roles: TODOS },
  { to: '/proveedores', icon: 'bi-truck', texto: 'Proveedores', roles: TODOS },
  { to: '/compras', icon: 'bi-bag-plus', texto: 'Compras', roles: TODOS },
  { to: '/clientes', icon: 'bi-person-vcard', texto: 'Clientes y Direcciones', roles: TODOS },
  { seccion: 'Inteligencia', roles: GESTION },
  { to: '/analisis', icon: 'bi-graph-up-arrow', texto: 'Análisis Estadístico', roles: GESTION },
  { to: '/recomendaciones', icon: 'bi-lightbulb', texto: 'Recomendaciones', roles: GESTION },
  { to: '/reportes', icon: 'bi-file-earmark-bar-graph', texto: 'Reportes', roles: GESTION },
  { to: '/importacion', icon: 'bi-upload', texto: 'Importar Excel', roles: GESTION },
  { seccion: 'Administración', roles: ['Administrador'] },
  { to: '/usuarios', icon: 'bi-people', texto: 'Usuarios', roles: ['Administrador'] },
  { to: '/configuracion-factura', icon: 'bi-receipt-cutoff', texto: 'Config. Factura', roles: ['Administrador'] },
];

export default function Layout() {
  const { usuario, logout, tieneRol } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const salir = () => {
    logout();
    navigate('/login');
  };

  return (
    <AccionesProvider>
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <i className="bi bi-bar-chart-line-fill me-2"></i>
          Distribuidora
          <div className="small fw-normal text-white-50" style={{ fontSize: '0.72rem' }}>
            Sistema Inteligente Estadístico
          </div>
        </div>
        <nav className="nav flex-column py-2">
          {enlaces.map((e, i) => {
            if (e.roles && !tieneRol(...e.roles)) return null;
            if (e.seccion) return <div key={i} className="nav-section">{e.seccion}</div>;
            return (
              <NavLink key={i} to={e.to} end={e.end} className="nav-link" onClick={() => setOpen(false)}>
                <i className={`bi ${e.icon}`}></i>
                {e.texto}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="btn btn-sm btn-outline-secondary d-md-none" onClick={() => setOpen(!open)}>
            <i className="bi bi-list"></i>
          </button>
          <div className="ms-auto d-flex align-items-center gap-3">
            <BarraAcciones />
            <span className="text-muted small">
              <i className="bi bi-person-circle me-1"></i>
              {usuario?.nombre} · <span className="badge bg-primary-subtle text-primary">{usuario?.rol}</span>
            </span>
            <button className="btn btn-sm btn-outline-danger" onClick={salir}>
              <i className="bi bi-box-arrow-right me-1"></i>Salir
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
    </AccionesProvider>
  );
}
