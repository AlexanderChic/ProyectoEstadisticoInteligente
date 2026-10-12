import { Router } from 'express';
import { getPool, query, sql } from '../config/db.js';
import { autenticar, permitirRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { aplicarMovimiento } from '../services/inventarioService.js';

const router = Router();
router.use(autenticar);

/* HU-14 · Registrar venta (uno o varios productos). Descuenta inventario. */
router.post(
  '/',
  permitirRoles('Administrador', 'Propietario', 'Empleado'),
  asyncHandler(async (req, res) => {
    const { fecha, observaciones, items, nit, nombre_cliente, direccion, cliente_id, direccion_id } = req.body;
    if (!Array.isArray(items) || items.length === 0) throw badRequest('Debe incluir al menos un producto');
    for (const it of items) {
      if (!it.producto_id || !it.cantidad || Number(it.cantidad) <= 0)
        throw badRequest('Cada item requiere producto_id y cantidad > 0');
    }

    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      // Cabecera de venta
      const cab = new sql.Request(tx);
      cab.input('fecha', sql.Date, fecha || new Date());
      cab.input('obs', sql.NVarChar(255), observaciones || null);
      cab.input('uid', sql.Int, req.usuario.id);
      cab.input('nit', sql.NVarChar(30), nit || null);
      cab.input('cliente', sql.NVarChar(160), nombre_cliente || null);
      cab.input('dir', sql.NVarChar(255), direccion || null);
      cab.input('cliente_id', sql.Int, cliente_id || null);
      cab.input('direccion_id', sql.Int, direccion_id || null);
      const ventaId = (
        await cab.query(
          `INSERT INTO dbo.ventas (fecha, observaciones, usuario_id, nit, nombre_cliente, direccion, cliente_id, direccion_id)
           OUTPUT INSERTED.id VALUES (@fecha, @obs, @uid, @nit, @cliente, @dir, @cliente_id, @direccion_id)`
        )
      ).recordset[0].id;

      let total = 0;
      for (const it of items) {
        // Precio: el enviado o el precio_venta del producto
        const preq = new sql.Request(tx);
        preq.input('pid', sql.Int, it.producto_id);
        const prod = (await preq.query('SELECT precio_venta FROM dbo.productos WHERE id=@pid')).recordset[0];
        if (!prod) throw new Error(`Producto ${it.producto_id} no existe`);
        const precio = it.precio_unitario != null ? Number(it.precio_unitario) : Number(prod.precio_venta);
        const subtotal = precio * Number(it.cantidad);
        total += subtotal;

        const det = new sql.Request(tx);
        det.input('vid', sql.Int, ventaId);
        det.input('pid', sql.Int, it.producto_id);
        det.input('cant', sql.Decimal(12, 2), it.cantidad);
        det.input('precio', sql.Decimal(12, 2), precio);
        await det.query(
          `INSERT INTO dbo.venta_detalle (venta_id, producto_id, cantidad, precio_unitario)
           VALUES (@vid, @pid, @cant, @precio)`
        );

        // Descuenta stock (SALIDA)
        await aplicarMovimiento(tx, {
          producto_id: it.producto_id,
          tipo: 'SALIDA',
          cantidad: it.cantidad,
          motivo: 'VENTA',
          referencia: `VENTA-${ventaId}`,
          usuario_id: req.usuario.id,
        });
      }

      const upd = new sql.Request(tx);
      upd.input('vid', sql.Int, ventaId);
      upd.input('total', sql.Decimal(12, 2), total);
      await upd.query('UPDATE dbo.ventas SET total=@total WHERE id=@vid');

      await tx.commit();
      res.status(201).json({ ok: true, id: ventaId, total });
    } catch (e) {
      await tx.rollback();
      throw badRequest(e.message);
    }
  })
);

/* HU-15 · Historial de ventas con filtros de fecha */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { desde, hasta } = req.query;
    const { recordset } = await query(
      `SELECT v.id, v.fecha, v.total, v.observaciones, u.nombre AS usuario,
              (SELECT COUNT(*) FROM dbo.venta_detalle d WHERE d.venta_id = v.id) AS lineas
       FROM dbo.ventas v LEFT JOIN dbo.usuarios u ON u.id = v.usuario_id
       WHERE (@desde IS NULL OR v.fecha >= @desde) AND (@hasta IS NULL OR v.fecha <= @hasta)
       ORDER BY v.fecha DESC, v.id DESC`,
      { desde: desde || null, hasta: hasta || null }
    );
    res.json({ ok: true, data: recordset });
  })
);

/* Detalle de una venta */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const cab = (await query('SELECT * FROM dbo.ventas WHERE id=@id', { id: req.params.id })).recordset[0];
    if (!cab) throw notFound('Venta no encontrada');
    const det = (
      await query(
        `SELECT d.*, p.nombre AS producto, p.sku FROM dbo.venta_detalle d
         JOIN dbo.productos p ON p.id = d.producto_id WHERE d.venta_id=@id`,
        { id: req.params.id }
      )
    ).recordset;
    res.json({ ok: true, data: { ...cab, detalle: det } });
  })
);

export default router;
