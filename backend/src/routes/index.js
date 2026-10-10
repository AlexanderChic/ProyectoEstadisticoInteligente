import { Router } from 'express';
import auth from './auth.routes.js';
import usuarios from './usuarios.routes.js';
import categorias from './categorias.routes.js';
import productos from './productos.routes.js';
import inventario from './inventario.routes.js';
import ventas from './ventas.routes.js';
import proveedores from './proveedores.routes.js';
import compras from './compras.routes.js';
import analitica from './analitica.routes.js';
import recomendaciones from './recomendaciones.routes.js';
import reportes from './reportes.routes.js';
import dashboard from './dashboard.routes.js';
import importacion from './importacion.routes.js';
import configuracion from './config.routes.js';
import direcciones from './direcciones.routes.js';

const router = Router();

router.get('/', (_req, res) =>
  res.json({ ok: true, api: 'Sistema Inteligente Estadístico - Distribuidora', version: '1.0.0' })
);

router.use('/auth', auth);
router.use('/usuarios', usuarios);
router.use('/categorias', categorias);
router.use('/productos', productos);
router.use('/inventario', inventario);
router.use('/ventas', ventas);
router.use('/proveedores', proveedores);
router.use('/compras', compras);
router.use('/analitica', analitica);
router.use('/recomendaciones', recomendaciones);
router.use('/reportes', reportes);
router.use('/dashboard', dashboard);
router.use('/importacion', importacion);
router.use('/config', configuracion);
router.use('/direcciones', direcciones);

export default router;
