import { Router } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { query } from '../config/db.js';
import { autenticar } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(autenticar);

const money = (v) => `Q ${Number(v || 0).toFixed(2)}`;

/* ---------- Helpers de exportación ---------- */
function enviarExcel(res, workbook, nombre) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${nombre}.xlsx"`);
  return workbook.xlsx.write(res).then(() => res.end());
}

function iniciarPDF(res, nombre) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${nombre}.pdf"`);
  doc.pipe(res);
  return doc;
}

function encabezadoPDF(doc, titulo) {
  doc.fontSize(16).text('Distribuidora de Productos de Consumo Masivo', { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(13).fillColor('#0d6efd').text(titulo, { align: 'center' });
  doc.fillColor('black').fontSize(9).text(`Generado: ${new Date().toLocaleString('es-GT')}`, { align: 'center' });
  doc.moveDown(1);
}

/* HU-30 · Reporte de ventas (Excel) */
router.get(
  '/ventas/excel',
  asyncHandler(async (req, res) => {
    const { desde, hasta } = req.query;
    const { recordset } = await query(
      `SELECT v.id, v.fecha, v.total, u.nombre AS usuario
       FROM dbo.ventas v LEFT JOIN dbo.usuarios u ON u.id=v.usuario_id
       WHERE (@desde IS NULL OR v.fecha>=@desde) AND (@hasta IS NULL OR v.fecha<=@hasta)
       ORDER BY v.fecha DESC`,
      { desde: desde || null, hasta: hasta || null }
    );
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Ventas');
    ws.columns = [
      { header: 'No.', key: 'id', width: 10 },
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Usuario', key: 'usuario', width: 25 },
      { header: 'Total (Q)', key: 'total', width: 15 },
    ];
    ws.getRow(1).font = { bold: true };
    recordset.forEach((r) =>
      ws.addRow({ id: r.id, fecha: r.fecha.toISOString().slice(0, 10), usuario: r.usuario, total: Number(r.total) })
    );
    ws.addRow({});
    ws.addRow({ usuario: 'TOTAL', total: recordset.reduce((a, r) => a + Number(r.total), 0) }).font = {
      bold: true,
    };
    await enviarExcel(res, wb, 'reporte_ventas');
  })
);

/* HU-30 · Reporte de ventas (PDF) */
router.get(
  '/ventas/pdf',
  asyncHandler(async (req, res) => {
    const { desde, hasta } = req.query;
    const { recordset } = await query(
      `SELECT v.id, v.fecha, v.total, u.nombre AS usuario
       FROM dbo.ventas v LEFT JOIN dbo.usuarios u ON u.id=v.usuario_id
       WHERE (@desde IS NULL OR v.fecha>=@desde) AND (@hasta IS NULL OR v.fecha<=@hasta)
       ORDER BY v.fecha DESC`,
      { desde: desde || null, hasta: hasta || null }
    );
    const doc = iniciarPDF(res, 'reporte_ventas');
    encabezadoPDF(doc, 'Reporte de Ventas');
    doc.fontSize(10);
    doc.text('No.    Fecha        Usuario                       Total');
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.3);
    let total = 0;
    recordset.forEach((r) => {
      total += Number(r.total);
      doc.text(
        `${String(r.id).padEnd(6)} ${r.fecha.toISOString().slice(0, 10)}   ${(r.usuario || '-').padEnd(28)} ${money(r.total)}`
      );
    });
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text(`TOTAL: ${money(total)}`, { align: 'right' });
    doc.end();
  })
);

/* HU-31 · Reporte de inventario actual (Excel) */
router.get(
  '/inventario/excel',
  asyncHandler(async (_req, res) => {
    const { recordset } = await query(
      `SELECT p.sku, p.nombre, c.nombre AS categoria, p.stock_actual, p.stock_minimo,
              p.precio_compra, p.precio_venta, (p.stock_actual*p.precio_compra) AS valor
       FROM dbo.productos p LEFT JOIN dbo.categorias c ON c.id=p.categoria_id
       WHERE p.activo=1 ORDER BY p.nombre`
    );
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Inventario');
    ws.columns = [
      { header: 'SKU', key: 'sku', width: 14 },
      { header: 'Producto', key: 'nombre', width: 30 },
      { header: 'Categoría', key: 'categoria', width: 18 },
      { header: 'Stock', key: 'stock_actual', width: 10 },
      { header: 'Mínimo', key: 'stock_minimo', width: 10 },
      { header: 'P. Compra', key: 'precio_compra', width: 12 },
      { header: 'P. Venta', key: 'precio_venta', width: 12 },
      { header: 'Valor (Q)', key: 'valor', width: 14 },
    ];
    ws.getRow(1).font = { bold: true };
    recordset.forEach((r) => ws.addRow(r));
    await enviarExcel(res, wb, 'reporte_inventario');
  })
);

/* HU-31 · Reporte de inventario actual (PDF) */
router.get(
  '/inventario/pdf',
  asyncHandler(async (_req, res) => {
    const { recordset } = await query(
      `SELECT p.sku, p.nombre, p.stock_actual, p.stock_minimo, (p.stock_actual*p.precio_compra) AS valor
       FROM dbo.productos p WHERE p.activo=1 ORDER BY p.nombre`
    );
    const doc = iniciarPDF(res, 'reporte_inventario');
    encabezadoPDF(doc, 'Reporte de Inventario Actual');
    doc.fontSize(10).text('SKU          Producto                        Stock   Mín.   Valor');
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.3);
    let valor = 0;
    recordset.forEach((r) => {
      valor += Number(r.valor);
      doc.text(
        `${(r.sku || '').padEnd(12)} ${(r.nombre || '').slice(0, 30).padEnd(32)} ${String(r.stock_actual).padEnd(7)} ${String(r.stock_minimo).padEnd(6)} ${money(r.valor)}`
      );
    });
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text(`VALOR TOTAL DEL INVENTARIO: ${money(valor)}`, { align: 'right' });
    doc.end();
  })
);

/* HU-32 · Reporte estadístico de tendencias y proyecciones (PDF) */
router.get(
  '/estadistico/pdf',
  asyncHandler(async (_req, res) => {
    const ranking = (
      await query(
        `SELECT TOP 10 p.nombre, SUM(d.cantidad) AS unidades, SUM(d.subtotal) AS ingresos
         FROM dbo.venta_detalle d JOIN dbo.productos p ON p.id=d.producto_id
         GROUP BY p.nombre ORDER BY unidades DESC`
      )
    ).recordset;
    const doc = iniciarPDF(res, 'reporte_estadistico');
    encabezadoPDF(doc, 'Reporte Estadístico: Productos Más Vendidos');
    doc.fontSize(10).text('Producto                              Unidades      Ingresos');
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.3);
    if (ranking.length === 0) doc.text('No hay datos de ventas registrados aún.');
    ranking.forEach((r) =>
      doc.text(`${(r.nombre || '').slice(0, 34).padEnd(36)} ${String(r.unidades).padEnd(12)} ${money(r.ingresos)}`)
    );
    doc.end();
  })
);

export default router;
