import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import BarraAcciones from './BarraAcciones.jsx';
import { AccionesProvider } from '../context/AccionesContext.jsx';

const enlaces = [
  { seccion: 'Principal' },
  { to: '/', icon: 'bi-speedometer2', texto: 'Dashboard', end: true },
  { seccion: 'Operación' },
  { to: '/escaner', icon: 'bi-upc-scan', texto: 'Ingreso Rápido / Escáner' },
  { to: '/productos', icon: 'bi-box-seam', texto: 'Productos' },
  { to: '/categorias', icon: 'bi-tags', texto: 'Categorías' },
  { to: '/inventario', icon: 'bi-clipboard-data', texto: 'Inventario' },
  { to: '/ventas', icon: 'bi-cart-check', texto: 'Ventas' },
  { to: '/proveedores', icon: 'bi-truck', texto: 'Proveedores' },
  { to: '/compras', icon: 'bi-bag-plus', texto: 'Compras' },
  { to: '/direcciones', icon: 'bi-geo-alt', texto: 'Direcciones' },
  { seccion: 'Inteligencia' },
  { to: '/analisis', icon: 'bi-graph-up-arrow', texto: 'Análisis Estadístico' },
  { to: '/recomendaciones', icon: 'bi-lightbulb', texto: 'Recomendaciones' },
  { to: '/reportes', icon: 'bi-file-earmark-bar-graph', texto: 'Reportes' },
  { to: '/importacion', icon: 'bi-upload', texto: 'Importar Excel' },
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
