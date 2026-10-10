import { Router } from 'express';
import { query, getPool, sql } from '../config/db.js';
import { autenticar, permitirRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { aplicarMovimiento } from '../services/inventarioService.js';

const router = Router();
router.use(autenticar);

/* HU-10 · Listar productos (con filtro de búsqueda y categoría) */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { buscar, categoria_id } = req.query;
    const { recordset } = await query(
      `SELECT p.id, p.sku, p.codigo_barras, p.nombre, p.unidad, p.precio_compra, p.precio_venta,
              p.stock_actual, p.stock_minimo, p.activo, p.categoria_id, c.nombre AS categoria,
              CASE WHEN p.stock_actual <= p.stock_minimo THEN 1 ELSE 0 END AS bajo_stock
       FROM dbo.productos p
       LEFT JOIN dbo.categorias c ON c.id = p.categoria_id
       WHERE (@buscar IS NULL OR p.nombre LIKE '%' + @buscar + '%' OR p.sku LIKE '%' + @buscar + '%'
              OR p.codigo_barras LIKE '%' + @buscar + '%')
         AND (@categoria_id IS NULL OR p.categoria_id = @categoria_id)
       ORDER BY p.nombre`,
      { buscar: buscar || null, categoria_id: categoria_id || null }
    );
    res.json({ ok: true, data: recordset });
  })
);

/* Búsqueda por código de barras (para el lector/escáner). Devuelve el producto o 404. */
router.get(
  '/barcode/:codigo',
  asyncHandler(async (req, res) => {
    const { recordset } = await query(
      `SELECT p.id, p.sku, p.codigo_barras, p.nombre, p.unidad, p.precio_compra, p.precio_venta,
              p.stock_actual, p.stock_minimo, p.activo, p.categoria_id, c.nombre AS categoria
       FROM dbo.productos p LEFT JOIN dbo.categorias c ON c.id = p.categoria_id
       WHERE p.codigo_barras = @codigo`,
      { codigo: req.params.codigo }
    );
    if (!recordset[0]) throw notFound('No existe un producto con ese código de barras');
    res.json({ ok: true, data: recordset[0] });
  })
);

/* Obtener un producto */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { recordset } = await query(
      `SELECT p.*, c.nombre AS categoria FROM dbo.productos p
       LEFT JOIN dbo.categorias c ON c.id = p.categoria_id WHERE p.id = @id`,
      { id: req.params.id }
    );
    if (!recordset[0]) throw notFound('Producto no encontrado');
    res.json({ ok: true, data: recordset[0] });
  })
);

/* HU-10 · Crear producto */
router.post(
  '/',
  permitirRoles('Administrador', 'Propietario', 'Empleado'),
  asyncHandler(async (req, res) => {
    const {
      sku, codigo_barras, nombre, categoria_id, unidad,
      precio_compra, precio_venta, stock_actual, stock_minimo,
    } = req.body;
    if (!sku || !nombre) throw badRequest('SKU y nombre son obligatorios');

    const { recordset } = await query(
      `INSERT INTO dbo.productos
         (sku, codigo_barras, nombre, categoria_id, unidad, precio_compra, precio_venta, stock_actual, stock_minimo)
       OUTPUT INSERTED.id
       VALUES (@sku, @codigo_barras, @nombre, @categoria_id, @unidad, @precio_compra, @precio_venta, @stock_actual, @stock_minimo)`,
      {
        sku,
        codigo_barras: codigo_barras || null,
        nombre,
        categoria_id: categoria_id || null,
        unidad: unidad || 'unidad',
        precio_compra: precio_compra || 0,
        precio_venta: precio_venta || 0,
        stock_actual: stock_actual || 0,
        stock_minimo: stock_minimo || 0,
      }
    );
    res.status(201).json({ ok: true, id: recordset[0].id });
  })
);

/* HU-10 · Actualizar producto */
router.put(
  '/:id',
  permitirRoles('Administrador', 'Propietario', 'Empleado'),
  asyncHandler(async (req, res) => {
    const existe = (await query('SELECT id FROM dbo.productos WHERE id = @id', { id: req.params.id }))
      .recordset[0];
    if (!existe) throw notFound('Producto no encontrado');
    const {
      sku, codigo_barras, nombre, categoria_id, unidad,
      precio_compra, precio_venta, stock_minimo, activo,
    } = req.body;
    await query(
      `UPDATE dbo.productos SET
         sku=@sku, codigo_barras=@codigo_barras, nombre=@nombre, categoria_id=@categoria_id, unidad=@unidad,
         precio_compra=@precio_compra, precio_venta=@precio_venta,
         stock_minimo=@stock_minimo, activo=@activo
       WHERE id=@id`,
      {
        id: req.params.id,
        sku,
        codigo_barras: codigo_barras || null,
        nombre,
        categoria_id: categoria_id || null,
        unidad: unidad || 'unidad',
        precio_compra: precio_compra || 0,
        precio_venta: precio_venta || 0,
        stock_minimo: stock_minimo || 0,
        activo: activo === false ? 0 : 1,
      }
    );
    res.json({ ok: true });
  })
);

/* Eliminar producto (lógico) */
router.delete(
  '/:id',
  permitirRoles('Administrador', 'Propietario'),
  asyncHandler(async (req, res) => {
    await query('UPDATE dbo.productos SET activo = 0 WHERE id = @id', { id: req.params.id });
    res.json({ ok: true });
  })
);

/* Ajuste rápido desde el escáner: actualiza precios y fija el stock actual.
   Si el stock cambia, registra un movimiento de AJUSTE por la diferencia. */
router.post(
  '/:id/ajuste',
  permitirRoles('Administrador', 'Propietario', 'Empleado'),
  asyncHandler(async (req, res) => {
    const { precio_compra, precio_venta, stock_actual } = req.body;
    const prod = (
      await query('SELECT id, stock_actual FROM dbo.productos WHERE id = @id', { id: req.params.id })
    ).recordset[0];
    if (!prod) throw notFound('Producto no encontrado');

    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      // Actualiza precios (los que vengan definidos)
      const upd = new sql.Request(tx);
      upd.input('id', sql.Int, req.params.id);
      upd.input('pc', sql.Decimal(12, 2), precio_compra != null ? Number(precio_compra) : null);
      upd.input('pv', sql.Decimal(12, 2), precio_venta != null ? Number(precio_venta) : null);
      await upd.query(
        `UPDATE dbo.productos SET
           precio_compra = COALESCE(@pc, precio_compra),
           precio_venta  = COALESCE(@pv, precio_venta)
         WHERE id = @id`
      );

      // Ajusta el stock si se envió un valor distinto al actual
      if (stock_actual != null && Number(stock_actual) !== Number(prod.stock_actual)) {
        const delta = Number(stock_actual) - Number(prod.stock_actual);
        await aplicarMovimiento(tx, {
          producto_id: Number(req.params.id),
          tipo: delta > 0 ? 'ENTRADA' : 'SALIDA',
          cantidad: Math.abs(delta),
          motivo: 'AJUSTE',
          referencia: 'Ajuste por escáner',
          usuario_id: req.usuario.id,
        });
      }

      await tx.commit();
      res.json({ ok: true });
    } catch (e) {
      await tx.rollback();
      throw badRequest(e.message);
    }
  })
);

export default router;
