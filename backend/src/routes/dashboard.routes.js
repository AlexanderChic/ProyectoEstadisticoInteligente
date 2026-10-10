import { Router } from 'express';
import { query } from '../config/db.js';
import { autenticar } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(autenticar);

/* HU-07 · Indicadores clave (KPIs) del dashboard */
router.get(
  '/kpis',
  asyncHandler(async (_req, res) => {
    const q = await query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.productos WHERE activo=1) AS total_productos,
        (SELECT ISNULL(SUM(stock_actual * precio_compra),0) FROM dbo.productos WHERE activo=1) AS valor_inventario,
        (SELECT COUNT(*) FROM dbo.productos WHERE activo=1 AND stock_actual <= stock_minimo) AS productos_bajo_stock,
        (SELECT ISNULL(SUM(total),0) FROM dbo.ventas WHERE fecha = CAST(GETDATE() AS DATE)) AS ventas_hoy,
        (SELECT ISNULL(SUM(total),0) FROM dbo.ventas WHERE MONTH(fecha)=MONTH(GETDATE()) AND YEAR(fecha)=YEAR(GETDATE())) AS ventas_mes,
        (SELECT COUNT(*) FROM dbo.ventas) AS total_ventas,
        (SELECT COUNT(*) FROM dbo.alertas WHERE resuelta=0) AS alertas_activas,
        (SELECT COUNT(*) FROM dbo.proveedores WHERE activo=1) AS total_proveedores
    `);
    res.json({ ok: true, data: q.recordset[0] });
  })
);

/* HU-08 · Resumen de ventas por día (para gráfico de líneas) */
router.get(
  '/ventas-resumen',
  asyncHandler(async (req, res) => {
    const dias = Math.max(1, parseInt(req.query.dias || '30', 10));
    const { recordset } = await query(
      `SELECT CAST(v.fecha AS DATE) AS fecha, SUM(v.total) AS total
       FROM dbo.ventas v
       WHERE v.fecha >= DATEADD(DAY, -@dias, CAST(GETDATE() AS DATE))
       GROUP BY CAST(v.fecha AS DATE) ORDER BY fecha`,
      { dias }
    );
    res.json({
      ok: true,
      data: {
        etiquetas: recordset.map((r) => r.fecha.toISOString().slice(0, 10)),
        totales: recordset.map((r) => Number(r.total)),
      },
    });
  })
);

/* HU-09 · Alertas activas */
router.get(
  '/alertas',
  asyncHandler(async (_req, res) => {
    const { recordset } = await query(
      `SELECT a.id, a.tipo, a.mensaje, a.nivel, a.creado_en, p.nombre AS producto
       FROM dbo.alertas a LEFT JOIN dbo.productos p ON p.id = a.producto_id
       WHERE a.resuelta = 0 ORDER BY
         CASE a.nivel WHEN 'CRITICO' THEN 0 WHEN 'ADVERTENCIA' THEN 1 ELSE 2 END, a.creado_en DESC`
    );
    res.json({ ok: true, data: recordset });
  })
);

/* Marcar alerta como resuelta */
router.put(
  '/alertas/:id/resolver',
  asyncHandler(async (req, res) => {
    await query('UPDATE dbo.alertas SET resuelta=1 WHERE id=@id', { id: req.params.id });
    res.json({ ok: true });
  })
);

/* HU-24 · Ventas por categoría (gráfico de pastel) */
router.get(
  '/ventas-por-categoria',
  asyncHandler(async (_req, res) => {
    const { recordset } = await query(
      `SELECT ISNULL(c.nombre, 'Sin categoría') AS categoria, SUM(d.subtotal) AS total
       FROM dbo.venta_detalle d
       JOIN dbo.productos p ON p.id = d.producto_id
       LEFT JOIN dbo.categorias c ON c.id = p.categoria_id
       GROUP BY c.nombre ORDER BY total DESC`
    );
    res.json({
      ok: true,
      data: {
        etiquetas: recordset.map((r) => r.categoria),
        totales: recordset.map((r) => Number(r.total)),
      },
    });
  })
);

/* HU-25 · Rotación de productos (unidades movidas) */
router.get(
  '/rotacion',
  asyncHandler(async (_req, res) => {
    const { recordset } = await query(
      `SELECT TOP 15 p.nombre, ISNULL(SUM(d.cantidad),0) AS unidades_vendidas, p.stock_actual
       FROM dbo.productos p
       LEFT JOIN dbo.venta_detalle d ON d.producto_id = p.id
       WHERE p.activo=1
       GROUP BY p.nombre, p.stock_actual ORDER BY unidades_vendidas DESC`
    );
    res.json({ ok: true, data: recordset });
  })
);

/* HU-29 · Ranking de productos más vendidos */
router.get(
  '/ranking',
  asyncHandler(async (req, res) => {
    const top = Math.max(1, parseInt(req.query.top || '10', 10));
    const { recordset } = await query(
      `SELECT TOP (@top) p.id, p.nombre, p.sku,
              SUM(d.cantidad) AS unidades, SUM(d.subtotal) AS ingresos
       FROM dbo.venta_detalle d JOIN dbo.productos p ON p.id = d.producto_id
       GROUP BY p.id, p.nombre, p.sku ORDER BY unidades DESC`,
      { top }
    );
    res.json({ ok: true, data: recordset });
  })
);

/* HU-26 · Comparativa de ventas entre dos periodos */
router.get(
  '/comparativa',
  asyncHandler(async (req, res) => {
    const { p1_desde, p1_hasta, p2_desde, p2_hasta } = req.query;
    const sumar = async (desde, hasta) =>
      Number(
        (
          await query(
            `SELECT ISNULL(SUM(total),0) AS t FROM dbo.ventas WHERE fecha BETWEEN @desde AND @hasta`,
            { desde, hasta }
          )
        ).recordset[0].t
      );
    const periodo1 = p1_desde && p1_hasta ? await sumar(p1_desde, p1_hasta) : 0;
    const periodo2 = p2_desde && p2_hasta ? await sumar(p2_desde, p2_hasta) : 0;
    const variacion = periodo1 ? ((periodo2 - periodo1) / periodo1) * 100 : 0;
    res.json({ ok: true, data: { periodo1, periodo2, variacion: Math.round(variacion * 100) / 100 } });
  })
);

export default router;
