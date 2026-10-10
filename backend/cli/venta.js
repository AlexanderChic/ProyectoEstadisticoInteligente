/* ============================================================================
   TERMINAL DE VENTAS (POS) - por línea de comandos, sin navegador
   ----------------------------------------------------------------------------
   Pensado para usar con el lector de código de barras: escanee un producto,
   indique la cantidad y continúe escaneando. Cada línea calcula
   (precio x cantidad) y al final se suman todos los subtotales.

   Uso:  cd backend  ->  npm run venta
   ============================================================================ */
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { getPool, sql } from '../src/config/db.js';
import { aplicarMovimiento } from '../src/services/inventarioService.js';

const money = (v) => 'Q' + Number(v || 0).toFixed(2);
const linea = (c = '=') => c.repeat(52);

async function buscarProducto(pool, codigo) {
  const r = await pool
    .request()
    .input('c', sql.NVarChar, codigo)
    .query(
      `SELECT TOP 1 id, sku, nombre, precio_venta, stock_actual
       FROM dbo.productos
       WHERE (codigo_barras = @c OR sku = @c) AND activo = 1`
    );
  return r.recordset[0];
}

/**
 * Registra una venta en la base de datos dentro de una transacción:
 * inserta la cabecera, el detalle y descuenta el stock. Devuelve id y total.
 */
export async function registrarVenta(pool, usuarioId, items) {
  const total = items.reduce((a, i) => a + i.cantidad * i.precio, 0);
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const cab = new sql.Request(tx);
    cab.input('total', sql.Decimal(12, 2), total);
    cab.input('uid', sql.Int, usuarioId);
    cab.input('obs', sql.NVarChar(255), 'Venta por terminal (escáner)');
    const ventaId = (
      await cab.query(
        `INSERT INTO dbo.ventas (fecha, total, usuario_id, observaciones)
         OUTPUT INSERTED.id VALUES (CAST(GETDATE() AS DATE), @total, @uid, @obs)`
      )
    ).recordset[0].id;

    for (const it of items) {
      const d = new sql.Request(tx);
      d.input('vid', sql.Int, ventaId);
      d.input('pid', sql.Int, it.producto_id);
      d.input('cant', sql.Decimal(12, 2), it.cantidad);
      d.input('precio', sql.Decimal(12, 2), it.precio);
      await d.query(
        `INSERT INTO dbo.venta_detalle (venta_id, producto_id, cantidad, precio_unitario)
         VALUES (@vid, @pid, @cant, @precio)`
      );
      await aplicarMovimiento(tx, {
        producto_id: it.producto_id,
        tipo: 'SALIDA',
        cantidad: it.cantidad,
        motivo: 'VENTA',
        referencia: `VENTA-${ventaId}`,
        usuario_id: usuarioId,
      });
    }
    await tx.commit();
    return { ventaId, total };
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

async function nuevaVenta(rl, pool, usuarioId) {
  const items = [];
  console.log('\n' + linea());
  console.log('  NUEVA VENTA');
  console.log(linea());
  console.log("  Escanee o escriba código/SKU y presione Enter.");
  console.log("  Comandos:  fin = cobrar  |  q = quitar último  |  x = cancelar\n");

  while (true) {
    const total = items.reduce((a, i) => a + i.subtotal, 0);
    const cod = (await rl.question(`  [${items.length} item(s) · Total ${money(total)}] Escanear > `)).trim();
    if (!cod) continue;
    const low = cod.toLowerCase();

    if (low === 'x' || low === 'cancelar') {
      console.log('  → Venta cancelada.\n');
      return;
    }
    if (low === 'q' || low === 'quitar') {
      const rem = items.pop();
      console.log(rem ? `  → Quitado: ${rem.nombre}` : '  (no hay items)');
      continue;
    }
    if (low === 'fin' || low === 'cobrar' || low === 'f') break;

    const prod = await buscarProducto(pool, cod);
    if (!prod) {
      console.log(`  ⚠  No se encontró el producto con código/SKU: ${cod}`);
      continue;
    }
    const cantStr = (await rl.question(`     ${prod.nombre} — ${money(prod.precio_venta)} (stock ${prod.stock_actual}) · Cantidad [1]: `)).trim();
    const cant = cantStr === '' ? 1 : Number(cantStr);
    if (!Number.isFinite(cant) || cant <= 0) {
      console.log('     Cantidad inválida, se omite.');
      continue;
    }
    const subtotal = cant * Number(prod.precio_venta);
    items.push({ producto_id: prod.id, nombre: prod.nombre, cantidad: cant, precio: Number(prod.precio_venta), subtotal });
    console.log(`     ✓ ${cant} x ${money(prod.precio_venta)} = ${money(subtotal)}`);
  }

  if (items.length === 0) {
    console.log('  Venta vacía, no se registra.\n');
    return;
  }

  // Resumen: producto por cantidad primero, luego el total general.
  console.log('\n' + linea('-'));
  console.log('  RESUMEN DE LA VENTA');
  console.log(linea('-'));
  for (const i of items) {
    console.log(`  ${i.nombre.slice(0, 26).padEnd(28)} ${String(i.cantidad).padStart(4)} x ${money(i.precio).padStart(9)} = ${money(i.subtotal).padStart(10)}`);
  }
  const total = items.reduce((a, i) => a + i.subtotal, 0);
  console.log(linea('-'));
  console.log(`  TOTAL A COBRAR: ${money(total)}`);
  console.log(linea('-'));

  const conf = (await rl.question('  ¿Confirmar y registrar la venta? (s/n): ')).trim().toLowerCase();
  if (conf !== 's' && conf !== 'si') {
    console.log('  → Venta descartada.\n');
    return;
  }

  // Guardar (descuenta stock con la misma lógica del sistema)
  try {
    const { ventaId } = await registrarVenta(pool, usuarioId, items);
    console.log(`\n  ✅ Venta #${ventaId} registrada correctamente. Total ${money(total)}\n`);
  } catch (e) {
    console.log(`\n  ❌ No se pudo registrar la venta: ${e.message}\n`);
  }
}

async function main() {
  console.log('\n====================================');
  console.log('   TERMINAL DE VENTAS · Distribuidora');
  console.log('====================================');
  let pool;
  try {
    pool = await getPool();
  } catch {
    console.error('No se pudo conectar a la base de datos. ¿Está corriendo SQL Server?');
    process.exit(1);
  }
  const u = (await pool.request().query('SELECT TOP 1 id FROM dbo.usuarios WHERE activo = 1 ORDER BY id')).recordset[0];
  const usuarioId = u ? u.id : null;

  // El readline se crea después de conectar a la BD, para no perder líneas
  // de entrada mientras se establece la conexión.
  const rl = readline.createInterface({ input, output });

  while (true) {
    await nuevaVenta(rl, pool, usuarioId);
    const otra = (await rl.question("¿Iniciar otra venta? (Enter = sí · 'salir' = terminar): ")).trim().toLowerCase();
    if (otra === 'salir' || otra === 'exit' || otra === 's a l i r') break;
  }
  rl.close();
  console.log('Terminal de ventas cerrada. ¡Hasta luego!');
  process.exit(0);
}

// Ejecuta la terminal interactiva solo cuando se corre directamente
// (no cuando el módulo se importa, p. ej. para pruebas).
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  main().catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  });
}
