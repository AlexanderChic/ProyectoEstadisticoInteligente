import { sql } from '../config/db.js';

/* ============================================================================
   Servicio de Inventario (FEAT-04)
   ----------------------------------------------------------------------------
   Centraliza la lógica de movimientos de stock para garantizar consistencia
   entre inventario, ventas y compras. Todo movimiento:
     1. Lee el stock actual del producto (con bloqueo dentro de la transacción).
     2. Calcula el nuevo stock (ENTRADA suma, SALIDA resta).
     3. Actualiza productos.stock_actual.
     4. Registra el movimiento en el libro mayor (movimientos_inventario).
     5. Genera una alerta si el stock queda por debajo del mínimo (HU-12).
   ============================================================================ */

/**
 * Aplica un movimiento de stock dentro de una transacción existente.
 * @param {sql.Transaction} tx  Transacción abierta.
 * @param {object} mov { producto_id, tipo, cantidad, motivo, referencia, usuario_id }
 */
export async function aplicarMovimiento(tx, mov) {
  const { producto_id, tipo, cantidad, motivo, referencia, usuario_id } = mov;

  const prodReq = new sql.Request(tx);
  prodReq.input('pid', sql.Int, producto_id);
  const prod = (
    await prodReq.query(
      'SELECT nombre, stock_actual, stock_minimo FROM dbo.productos WITH (UPDLOCK, ROWLOCK) WHERE id = @pid'
    )
  ).recordset[0];
  if (!prod) throw new Error(`Producto ${producto_id} no existe`);

  const previo = Number(prod.stock_actual);
  const delta = tipo === 'ENTRADA' ? Number(cantidad) : -Number(cantidad);
  const nuevo = previo + delta;
  if (nuevo < 0) throw new Error(`Stock insuficiente para "${prod.nombre}" (disponible: ${previo})`);

  const updReq = new sql.Request(tx);
  updReq.input('pid', sql.Int, producto_id);
  updReq.input('nuevo', sql.Decimal(12, 2), nuevo);
  await updReq.query('UPDATE dbo.productos SET stock_actual = @nuevo WHERE id = @pid');

  const movReq = new sql.Request(tx);
  movReq.input('pid', sql.Int, producto_id);
  movReq.input('tipo', sql.NVarChar(10), tipo);
  movReq.input('cant', sql.Decimal(12, 2), cantidad);
  movReq.input('previo', sql.Decimal(12, 2), previo);
  movReq.input('nuevoStock', sql.Decimal(12, 2), nuevo);
  movReq.input('motivo', sql.NVarChar(200), motivo || null);
  movReq.input('ref', sql.NVarChar(100), referencia || null);
  movReq.input('uid', sql.Int, usuario_id || null);
  await movReq.query(
    `INSERT INTO dbo.movimientos_inventario
       (producto_id, tipo, cantidad, stock_previo, stock_nuevo, motivo, referencia, usuario_id)
     VALUES (@pid, @tipo, @cant, @previo, @nuevoStock, @motivo, @ref, @uid)`
  );

  // HU-12 · Alerta automática de stock mínimo
  if (nuevo <= Number(prod.stock_minimo)) {
    const alertaReq = new sql.Request(tx);
    alertaReq.input('pid', sql.Int, producto_id);
    alertaReq.input(
      'msg',
      sql.NVarChar(300),
      `El producto "${prod.nombre}" alcanzó el stock mínimo (actual: ${nuevo}, mínimo: ${prod.stock_minimo}).`
    );
    alertaReq.input('nivel', sql.NVarChar(20), nuevo <= 0 ? 'CRITICO' : 'ADVERTENCIA');
    await alertaReq.query(
      `IF NOT EXISTS (SELECT 1 FROM dbo.alertas WHERE producto_id=@pid AND tipo='STOCK_MINIMO' AND resuelta=0)
       INSERT INTO dbo.alertas (tipo, producto_id, mensaje, nivel)
       VALUES ('STOCK_MINIMO', @pid, @msg, @nivel)`
    );
  }

  return { producto_id, stock_previo: previo, stock_nuevo: nuevo };
}
