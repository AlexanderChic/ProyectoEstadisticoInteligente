import { Router } from 'express';
import { getPool, query, sql } from '../config/db.js';
import { autenticar, permitirRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { aplicarMovimiento } from '../services/inventarioService.js';

const router = Router();
router.use(autenticar);

/* HU-18 · Registrar orden de compra (estado inicial PENDIENTE) */
router.post(
  '/',
  permitirRoles('Administrador', 'Propietario', 'Empleado'),
  asyncHandler(async (req, res) => {
    const { proveedor_id, fecha, observaciones, items } = req.body;
    if (!proveedor_id) throw badRequest('proveedor_id es obligatorio');
    if (!Array.isArray(items) || items.length === 0) throw badRequest('Debe incluir al menos un producto');

    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      const cab = new sql.Request(tx);
      cab.input('prov', sql.Int, proveedor_id);
      cab.input('fecha', sql.Date, fecha || new Date());
      cab.input('obs', sql.NVarChar(255), observaciones || null);
      cab.input('uid', sql.Int, req.usuario.id);
      const ordenId = (
        await cab.query(
          `INSERT INTO dbo.ordenes_compra (proveedor_id, fecha, observaciones, usuario_id)
           OUTPUT INSERTED.id VALUES (@prov, @fecha, @obs, @uid)`
        )
      ).recordset[0].id;

      let total = 0;
      for (const it of items) {
        if (!it.producto_id || !it.cantidad || !it.costo_unitario)
          throw new Error('Cada item requiere producto_id, cantidad y costo_unitario');
        total += Number(it.cantidad) * Number(it.costo_unitario);
        const det = new sql.Request(tx);
        det.input('oid', sql.Int, ordenId);
        det.input('pid', sql.Int, it.producto_id);
        det.input('cant', sql.Decimal(12, 2), it.cantidad);
        det.input('costo', sql.Decimal(12, 2), it.costo_unitario);
        await det.query(
          `INSERT INTO dbo.orden_compra_detalle (orden_id, producto_id, cantidad, costo_unitario)
           VALUES (@oid, @pid, @cant, @costo)`
        );
      }
      const upd = new sql.Request(tx);
      upd.input('oid', sql.Int, ordenId);
      upd.input('total', sql.Decimal(12, 2), total);
      await upd.query('UPDATE dbo.ordenes_compra SET total=@total WHERE id=@oid');

      await tx.commit();
      res.status(201).json({ ok: true, id: ordenId, total });
    } catch (e) {
      await tx.rollback();
      throw badRequest(e.message);
    }
  })
);

/* Recibir orden: cambia a RECIBIDA e ingresa el stock (ENTRADA) */
router.post(
  '/:id/recibir',
  permitirRoles('Administrador', 'Propietario', 'Empleado'),
  asyncHandler(async (req, res) => {
    const orden = (await query('SELECT * FROM dbo.ordenes_compra WHERE id=@id', { id: req.params.id }))
      .recordset[0];
    if (!orden) throw notFound('Orden no encontrada');
    if (orden.estado !== 'PENDIENTE') throw badRequest('La orden no está pendiente');

    const detalle = (
      await query('SELECT * FROM dbo.orden_compra_detalle WHERE orden_id=@id', { id: req.params.id })
    ).recordset;

    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      for (const d of detalle) {
        await aplicarMovimiento(tx, {
          producto_id: d.producto_id,
          tipo: 'ENTRADA',
          cantidad: d.cantidad,
          motivo: 'COMPRA',
          referencia: `OC-${orden.id}`,
          usuario_id: req.usuario.id,
        });
        // Actualiza precio de compra de referencia
        const pc = new sql.Request(tx);
        pc.input('pid', sql.Int, d.producto_id);
        pc.input('costo', sql.Decimal(12, 2), d.costo_unitario);
        await pc.query('UPDATE dbo.productos SET precio_compra=@costo WHERE id=@pid');
      }
      const upd = new sql.Request(tx);
      upd.input('id', sql.Int, orden.id);
      await upd.query("UPDATE dbo.ordenes_compra SET estado='RECIBIDA' WHERE id=@id");
      await tx.commit();
      res.json({ ok: true, mensaje: 'Orden recibida e inventario actualizado.' });
    } catch (e) {
      await tx.rollback();
      throw badRequest(e.message);
    }
  })
);

/* HU-19 · Historial de compras (filtro por proveedor) */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { proveedor_id, estado } = req.query;
    const { recordset } = await query(
      `SELECT o.id, o.fecha, o.estado, o.total, o.observaciones, pr.nombre AS proveedor
       FROM dbo.ordenes_compra o JOIN dbo.proveedores pr ON pr.id = o.proveedor_id
       WHERE (@prov IS NULL OR o.proveedor_id=@prov) AND (@estado IS NULL OR o.estado=@estado)
       ORDER BY o.fecha DESC, o.id DESC`,
      { prov: proveedor_id || null, estado: estado || null }
    );
    res.json({ ok: true, data: recordset });
  })
);

/* Detalle de una orden */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const cab = (
      await query(
        `SELECT o.*, pr.nombre AS proveedor FROM dbo.ordenes_compra o
         JOIN dbo.proveedores pr ON pr.id=o.proveedor_id WHERE o.id=@id`,
        { id: req.params.id }
      )
    ).recordset[0];
    if (!cab) throw notFound('Orden no encontrada');
    const det = (
      await query(
        `SELECT d.*, p.nombre AS producto, p.sku FROM dbo.orden_compra_detalle d
         JOIN dbo.productos p ON p.id=d.producto_id WHERE d.orden_id=@id`,
        { id: req.params.id }
      )
    ).recordset;
    res.json({ ok: true, data: { ...cab, detalle: det } });
  })
);

export default router;
