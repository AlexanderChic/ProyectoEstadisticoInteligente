import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Productos from './pages/Productos.jsx';
import Categorias from './pages/Categorias.jsx';
import Inventario from './pages/Inventario.jsx';
import Ventas from './pages/Ventas.jsx';
import Proveedores from './pages/Proveedores.jsx';
import Compras from './pages/Compras.jsx';
import Analisis from './pages/Analisis.jsx';
import Recomendaciones from './pages/Recomendaciones.jsx';
import Reportes from './pages/Reportes.jsx';
import Importacion from './pages/Importacion.jsx';
import Usuarios from './pages/Usuarios.jsx';

function Protegida({ children, roles }) {
  const { usuario, tieneRol } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (roles && !tieneRol(...roles)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Protegida>
            <Layout />
          </Protegida>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="productos" element={<Productos />} />
        <Route path="categorias" element={<Categorias />} />
        <Route path="inventario" element={<Inventario />} />
        <Route path="ventas" element={<Ventas />} />
        <Route path="proveedores" element={<Proveedores />} />
        <Route path="compras" element={<Compras />} />
        <Route path="analisis" element={<Analisis />} />
        <Route path="recomendaciones" element={<Recomendaciones />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="importacion" element={<Importacion />} />
        <Route
          path="usuarios"
          element={
            <Protegida roles={['Administrador']}>
              <Usuarios />
            </Protegida>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
