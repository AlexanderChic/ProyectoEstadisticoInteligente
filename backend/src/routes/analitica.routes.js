import { Router } from 'express';
import { query } from '../config/db.js';
import { autenticar } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/httpError.js';
import {
  estadisticaDescriptiva,
  promedioMovil,
  tendenciaLineal,
  proyectarDemanda,
} from '../utils/statistics.js';

const router = Router();
router.use(autenticar);

/** Devuelve la serie semanal de unidades vendidas de un producto. */
async function serieSemanal(producto_id) {
  const { recordset } = await query(
    `SELECT DATEADD(WEEK, DATEDIFF(WEEK, 0, v.fecha), 0) AS semana, SUM(d.cantidad) AS cantidad
     FROM dbo.ventas v JOIN dbo.venta_detalle d ON d.venta_id = v.id
     WHERE d.producto_id = @pid
     GROUP BY DATEADD(WEEK, DATEDIFF(WEEK, 0, v.fecha), 0)
     ORDER BY semana`,
    { pid: producto_id }
  );
  return recordset.map((r) => ({
    semana: r.semana.toISOString().slice(0, 10),
    cantidad: Number(r.cantidad),
  }));
}

/* HU-20 · Promedios móviles de ventas */
router.get(
  '/promedios-moviles',
  asyncHandler(async (req, res) => {
    const { producto_id, ventana } = req.query;
    if (!producto_id) throw badRequest('producto_id es obligatorio');
    const serie = await serieSemanal(producto_id);
    const valores = serie.map((s) => s.cantidad);
    const win = Math.max(2, parseInt(ventana || '3', 10));
    const pm = promedioMovil(valores, win);
    res.json({
      ok: true,
      data: {
        ventana: win,
        etiquetas: serie.map((s) => s.semana),
        ventas: valores,
        promedioMovil: pm,
      },
    });
  })
);

/* HU-21 · Análisis de tendencia de ventas */
router.get(
  '/tendencias',
  asyncHandler(async (req, res) => {
    const { producto_id } = req.query;
    if (!producto_id) throw badRequest('producto_id es obligatorio');
    const serie = await serieSemanal(producto_id);
    const valores = serie.map((s) => s.cantidad);
    const tendencia = tendenciaLineal(valores);
    // Línea de tendencia para graficar
    const linea = valores.map((_, i) => tendencia.pendiente * i + tendencia.intercepto);
    res.json({
      ok: true,
      data: { ...tendencia, etiquetas: serie.map((s) => s.semana), ventas: valores, linea },
    });
  })
);

/* HU-22 · Estadística descriptiva por producto o categoría */
router.get(
  '/descriptiva',
  asyncHandler(async (req, res) => {
    const { producto_id, categoria_id } = req.query;
    if (!producto_id && !categoria_id) throw badRequest('Indique producto_id o categoria_id');

    const { recordset } = await query(
      `SELECT d.cantidad
       FROM dbo.venta_detalle d
       JOIN dbo.ventas v ON v.id = d.venta_id
       JOIN dbo.productos p ON p.id = d.producto_id
       WHERE (@pid IS NULL OR d.producto_id = @pid)
         AND (@cid IS NULL OR p.categoria_id = @cid)`,
      { pid: producto_id || null, cid: categoria_id || null }
    );
    const valores = recordset.map((r) => Number(r.cantidad));
    res.json({ ok: true, data: estadisticaDescriptiva(valores) });
  })
);

/* HU-23 · Proyección de demanda a N semanas */
router.get(
  '/proyeccion',
  asyncHandler(async (req, res) => {
    const { producto_id, periodos } = req.query;
    if (!producto_id) throw badRequest('producto_id es obligatorio');
    const serie = await serieSemanal(producto_id);
    const valores = serie.map((s) => s.cantidad);
    const n = Math.max(1, parseInt(periodos || '4', 10));
    const proyeccion = proyectarDemanda(valores, n);
    res.json({
      ok: true,
      data: {
        historico: valores,
        etiquetas: serie.map((s) => s.semana),
        proyeccion,
        tendencia: tendenciaLineal(valores),
      },
    });
  })
);

export default router;
