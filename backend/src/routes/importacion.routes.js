import { Router } from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { getPool, query, sql } from '../config/db.js';
import { autenticar, permitirRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/httpError.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
router.use(autenticar);

/** Lee la primera hoja de un archivo Excel en memoria y devuelve filas como objetos. */
async function leerExcel(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) throw badRequest('El archivo no contiene hojas');
  const headers = [];
  ws.getRow(1).eachCell((cell, col) => (headers[col] = String(cell.value || '').trim().toLowerCase()));
  const filas = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const obj = {};
    row.eachCell((cell, col) => (obj[headers[col]] = cell.value));
    filas.push(obj);
  });
  return filas;
}

/* HU-13 · Importar inventario inicial / productos desde Excel
   Columnas esperadas: sku, nombre, categoria, unidad, precio_compra, precio_venta, stock_actual, stock_minimo */
router.post(
  '/productos',
  permitirRoles('Administrador', 'Propietario', 'Empleado'),
  upload.single('archivo'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('Adjunte un archivo Excel en el campo "archivo"');
    const filas = await leerExcel(req.file.buffer);
    let creados = 0;
    let actualizados = 0;
    const errores = [];

    for (const [i, f] of filas.entries()) {
      try {
        const sku = String(f.sku || '').trim();
        const nombre = String(f.nombre || '').trim();
        if (!sku || !nombre) throw new Error('sku y nombre son obligatorios');

        // Categoría por nombre (crea si no existe)
        let categoria_id = null;
        if (f.categoria) {
          const cat = String(f.categoria).trim();
          const existente = (await query('SELECT id FROM dbo.categorias WHERE nombre=@n', { n: cat }))
            .recordset[0];
          categoria_id = existente
            ? existente.id
            : (await query('INSERT INTO dbo.categorias (nombre) OUTPUT INSERTED.id VALUES (@n)', { n: cat }))
                .recordset[0].id;
        }

        const yaExiste = (await query('SELECT id FROM dbo.productos WHERE sku=@sku', { sku })).recordset[0];
        const params = {
          sku,
          nombre,
          categoria_id,
          unidad: f.unidad ? String(f.unidad) : 'unidad',
          pc: Number(f.precio_compra) || 0,
          pv: Number(f.precio_venta) || 0,
          sa: Number(f.stock_actual) || 0,
          sm: Number(f.stock_minimo) || 0,
        };
        if (yaExiste) {
          await query(
            `UPDATE dbo.productos SET nombre=@nombre, categoria_id=@categoria_id, unidad=@unidad,
             precio_compra=@pc, precio_venta=@pv, stock_actual=@sa, stock_minimo=@sm WHERE sku=@sku`,
            params
          );
          actualizados++;
        } else {
          await query(
            `INSERT INTO dbo.productos (sku, nombre, categoria_id, unidad, precio_compra, precio_venta, stock_actual, stock_minimo)
             VALUES (@sku, @nombre, @categoria_id, @unidad, @pc, @pv, @sa, @sm)`,
            params
          );
          creados++;
        }
      } catch (e) {
        errores.push({ fila: i + 2, error: e.message });
      }
    }
    res.json({ ok: true, creados, actualizados, errores });
  })
);

/* HU-16 · Importar ventas históricas desde Excel
   Columnas esperadas: fecha, sku, cantidad, precio_unitario
   Cada fila genera una venta con su detalle (para análisis histórico). No
   modifica el stock actual, pues son movimientos ya ocurridos en el pasado. */
router.post(
  '/ventas',
  permitirRoles('Administrador', 'Propietario', 'Empleado'),
  upload.single('archivo'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('Adjunte un archivo Excel en el campo "archivo"');
    const filas = await leerExcel(req.file.buffer);
    let importadas = 0;
    const errores = [];
    const pool = await getPool();

    for (const [i, f] of filas.entries()) {
      const tx = new sql.Transaction(pool);
      try {
        const sku = String(f.sku || '').trim();
        const cantidad = Number(f.cantidad);
        if (!sku || !cantidad) throw new Error('sku y cantidad son obligatorios');
        const fecha = f.fecha ? new Date(f.fecha) : new Date();

        const prod = (
          await query('SELECT id, precio_venta FROM dbo.productos WHERE sku=@sku', { sku })
        ).recordset[0];
        if (!prod) throw new Error(`Producto con sku ${sku} no existe`);
        const precio = f.precio_unitario != null ? Number(f.precio_unitario) : Number(prod.precio_venta);

        await tx.begin();
        const cab = new sql.Request(tx);
        cab.input('fecha', sql.Date, fecha);
        cab.input('uid', sql.Int, req.usuario.id);
        cab.input('total', sql.Decimal(12, 2), precio * cantidad);
        cab.input('obs', sql.NVarChar(255), 'Importación histórica');
        const ventaId = (
          await cab.query(
            `INSERT INTO dbo.ventas (fecha, total, usuario_id, observaciones)
             OUTPUT INSERTED.id VALUES (@fecha, @total, @uid, @obs)`
          )
        ).recordset[0].id;

        const det = new sql.Request(tx);
        det.input('vid', sql.Int, ventaId);
        det.input('pid', sql.Int, prod.id);
        det.input('cant', sql.Decimal(12, 2), cantidad);
        det.input('precio', sql.Decimal(12, 2), precio);
        await det.query(
          `INSERT INTO dbo.venta_detalle (venta_id, producto_id, cantidad, precio_unitario)
           VALUES (@vid, @pid, @cant, @precio)`
        );

        await tx.commit();
        importadas++;
      } catch (e) {
        try {
          await tx.rollback();
        } catch {
          /* noop */
        }
        errores.push({ fila: i + 2, error: e.message });
      }
    }
    res.json({ ok: true, importadas, errores });
  })
);

export default router;
