import { Router } from 'express';
import { query } from '../config/db.js';
import { autenticar, permitirRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';

const router = Router();
router.use(autenticar);

/* HU-10 · Listar productos (con filtro de búsqueda y categoría) */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { buscar, categoria_id } = req.query;
    const { recordset } = await query(
      `SELECT p.id, p.sku, p.nombre, p.unidad, p.precio_compra, p.precio_venta,
              p.stock_actual, p.stock_minimo, p.activo, p.categoria_id, c.nombre AS categoria,
              CASE WHEN p.stock_actual <= p.stock_minimo THEN 1 ELSE 0 END AS bajo_stock
       FROM dbo.productos p
       LEFT JOIN dbo.categorias c ON c.id = p.categoria_id
       WHERE (@buscar IS NULL OR p.nombre LIKE '%' + @buscar + '%' OR p.sku LIKE '%' + @buscar + '%')
         AND (@categoria_id IS NULL OR p.categoria_id = @categoria_id)
       ORDER BY p.nombre`,
      { buscar: buscar || null, categoria_id: categoria_id || null }
    );
    res.json({ ok: true, data: recordset });
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
    const { sku, nombre, categoria_id, unidad, precio_compra, precio_venta, stock_actual, stock_minimo } =
      req.body;
    if (!sku || !nombre) throw badRequest('SKU y nombre son obligatorios');

    const { recordset } = await query(
      `INSERT INTO dbo.productos
         (sku, nombre, categoria_id, unidad, precio_compra, precio_venta, stock_actual, stock_minimo)
       OUTPUT INSERTED.id
       VALUES (@sku, @nombre, @categoria_id, @unidad, @precio_compra, @precio_venta, @stock_actual, @stock_minimo)`,
      {
        sku,
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
    const { sku, nombre, categoria_id, unidad, precio_compra, precio_venta, stock_minimo, activo } =
      req.body;
    await query(
      `UPDATE dbo.productos SET
         sku=@sku, nombre=@nombre, categoria_id=@categoria_id, unidad=@unidad,
         precio_compra=@precio_compra, precio_venta=@precio_venta,
         stock_minimo=@stock_minimo, activo=@activo
       WHERE id=@id`,
      {
        id: req.params.id,
        sku,
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

export default router;
