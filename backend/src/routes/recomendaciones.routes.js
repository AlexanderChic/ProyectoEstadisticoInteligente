import { Router } from 'express';
import { query } from '../config/db.js';
import { autenticar, permitirRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/httpError.js';
import { media, proyectarDemanda, tendenciaLineal } from '../utils/statistics.js';
import { iaDisponible, generarInsights } from '../services/iaService.js';

const router = Router();
router.use(autenticar);

/** Serie semanal de ventas de un producto (unidades). */
async function serieSemanal(producto_id) {
  const { recordset } = await query(
    `SELECT DATEADD(WEEK, DATEDIFF(WEEK, 0, v.fecha), 0) AS semana, SUM(d.cantidad) AS cantidad
     FROM dbo.ventas v JOIN dbo.venta_detalle d ON d.venta_id = v.id
     WHERE d.producto_id = @pid
     GROUP BY DATEADD(WEEK, DATEDIFF(WEEK, 0, v.fecha), 0) ORDER BY semana`,
    { pid: producto_id }
  );
  return recordset.map((r) => Number(r.cantidad));
}

/* HU-27 · Alertas automáticas de reposición de stock */
router.get(
  '/reposicion',
  asyncHandler(async (_req, res) => {
    const { recordset } = await query(
      `SELECT id, sku, nombre, stock_actual, stock_minimo
       FROM dbo.productos WHERE activo=1 AND stock_actual <= stock_minimo ORDER BY stock_actual`
    );
    const data = recordset.map((p) => ({
      ...p,
      faltante: Math.max(0, Number(p.stock_minimo) - Number(p.stock_actual)),
      mensaje: `Reponer "${p.nombre}": stock ${p.stock_actual} ≤ mínimo ${p.stock_minimo}.`,
    }));
    res.json({ ok: true, data });
  })
);

/* HU-28 · Sugerencia de cantidad óptima de compra */
router.get(
  '/cantidad-optima',
  asyncHandler(async (req, res) => {
    const { producto_id, semanas_cobertura } = req.query;
    if (!producto_id) throw badRequest('producto_id es obligatorio');
    const cobertura = Math.max(1, parseInt(semanas_cobertura || '4', 10));

    const serie = await serieSemanal(producto_id);
    const prod = (
      await query('SELECT nombre, stock_actual, stock_minimo FROM dbo.productos WHERE id=@id', {
        id: producto_id,
      })
    ).recordset[0];
    if (!prod) throw badRequest('Producto no encontrado');

    const demandaPromedio = media(serie);
    const proyeccion = proyectarDemanda(serie, cobertura);
    const demandaEsperada = proyeccion.reduce((a, b) => a + b, 0);
    // Cantidad óptima = demanda esperada del periodo + colchón de stock mínimo - stock actual
    const cantidadOptima = Math.max(
      0,
      Math.ceil(demandaEsperada + Number(prod.stock_minimo) - Number(prod.stock_actual))
    );

    res.json({
      ok: true,
      data: {
        producto: prod.nombre,
        stock_actual: Number(prod.stock_actual),
        demanda_promedio_semanal: Math.round(demandaPromedio * 100) / 100,
        semanas_cobertura: cobertura,
        demanda_esperada: Math.round(demandaEsperada * 100) / 100,
        cantidad_optima_compra: cantidadOptima,
        tendencia: tendenciaLineal(serie).direccion,
      },
    });
  })
);

/* Listar recomendaciones almacenadas */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { recordset } = await query(
      `SELECT r.id, r.tipo, r.titulo, r.contenido, r.origen, r.creado_en, p.nombre AS producto
       FROM dbo.recomendaciones r LEFT JOIN dbo.productos p ON p.id = r.producto_id
       ORDER BY r.creado_en DESC`
    );
    res.json({ ok: true, data: recordset });
  })
);

/* Insight de IA (Claude). Requiere ANTHROPIC_API_KEY. FEAT-09 / opcional. */
router.post(
  '/ia',
  permitirRoles('Administrador', 'Propietario'),
  asyncHandler(async (req, res) => {
    if (!iaDisponible()) {
      return res.status(503).json({
        ok: false,
        error: 'IA no configurada. Defina ANTHROPIC_API_KEY en el archivo .env del backend.',
      });
    }

    // Reúne un contexto estadístico compacto para la IA
    const ranking = (
      await query(
        `SELECT TOP 10 p.nombre, SUM(d.cantidad) AS unidades, SUM(d.subtotal) AS ingresos
         FROM dbo.venta_detalle d JOIN dbo.productos p ON p.id=d.producto_id
         GROUP BY p.nombre ORDER BY unidades DESC`
      )
    ).recordset;
    const bajoStock = (
      await query(
        `SELECT nombre, stock_actual, stock_minimo FROM dbo.productos
         WHERE activo=1 AND stock_actual <= stock_minimo`
      )
    ).recordset;
    const kpis = (
      await query(`SELECT
        (SELECT COUNT(*) FROM dbo.productos WHERE activo=1) AS productos,
        (SELECT ISNULL(SUM(total),0) FROM dbo.ventas WHERE MONTH(fecha)=MONTH(GETDATE())) AS ventas_mes`)
    ).recordset[0];

    const contexto = { kpis, productos_mas_vendidos: ranking, productos_bajo_stock: bajoStock };
    const texto = await generarInsights(contexto);

    // Guarda la recomendación de IA
    await query(
      `INSERT INTO dbo.recomendaciones (tipo, titulo, contenido, origen)
       VALUES ('INSIGHT_IA', @titulo, @contenido, 'IA')`,
      { titulo: 'Análisis inteligente de negocio', contenido: texto }
    );

    res.json({ ok: true, data: { insights: texto } });
  })
);

export default router;
