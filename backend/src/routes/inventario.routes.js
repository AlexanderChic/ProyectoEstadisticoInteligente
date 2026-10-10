import { Router } from 'express';
import { getPool, query, sql } from '../config/db.js';
import { autenticar, permitirRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/httpError.js';
import { aplicarMovimiento } from '../services/inventarioService.js';

const router = Router();
router.use(autenticar);

/* HU-11 · Registrar entrada o salida manual de inventario */
router.post(
  '/movimientos',
  permitirRoles('Administrador', 'Propietario', 'Empleado'),
  asyncHandler(async (req, res) => {
    const { producto_id, tipo, cantidad, motivo } = req.body;
    if (!producto_id || !tipo || !cantidad) throw badRequest('producto_id, tipo y cantidad son obligatorios');
    if (!['ENTRADA', 'SALIDA'].includes(tipo)) throw badRequest('tipo debe ser ENTRADA o SALIDA');
    if (Number(cantidad) <= 0) throw badRequest('La cantidad debe ser mayor a cero');

    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      const r = await aplicarMovimiento(tx, {
        producto_id,
        tipo,
        cantidad,
        motivo: motivo || 'AJUSTE',
        usuario_id: req.usuario.id,
      });
      await tx.commit();
      res.status(201).json({ ok: true, ...r });
    } catch (e) {
      await tx.rollback();
      throw badRequest(e.message);
    }
  })
);

/* Historial de movimientos (con filtros por producto y tipo) */
router.get(
  '/movimientos',
  asyncHandler(async (req, res) => {
    const { producto_id, tipo } = req.query;
    const { recordset } = await query(
      `SELECT TOP 500 m.id, m.tipo, m.cantidad, m.stock_previo, m.stock_nuevo,
              m.motivo, m.referencia, m.fecha, p.nombre AS producto, u.nombre AS usuario
       FROM dbo.movimientos_inventario m
       JOIN dbo.productos p ON p.id = m.producto_id
       LEFT JOIN dbo.usuarios u ON u.id = m.usuario_id
       WHERE (@producto_id IS NULL OR m.producto_id = @producto_id)
         AND (@tipo IS NULL OR m.tipo = @tipo)
       ORDER BY m.fecha DESC`,
      { producto_id: producto_id || null, tipo: tipo || null }
    );
    res.json({ ok: true, data: recordset });
  })
);

/* Productos con stock bajo el mínimo */
router.get(
  '/bajo-stock',
  asyncHandler(async (_req, res) => {
    const { recordset } = await query(
      `SELECT id, sku, nombre, stock_actual, stock_minimo
       FROM dbo.productos WHERE activo = 1 AND stock_actual <= stock_minimo
       ORDER BY stock_actual`
    );
    res.json({ ok: true, data: recordset });
  })
);

export default router;
