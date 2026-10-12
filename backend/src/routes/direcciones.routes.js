import { Router } from 'express';
import { query } from '../config/db.js';
import { autenticar, permitirRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';

const router = Router();
router.use(autenticar);

/* Búsqueda de direcciones (por Cluster, Casa o nombre del cliente) para la venta.
   Cada dirección pertenece a un cliente (cliente_id). */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { buscar } = req.query;
    const { recordset } = await query(
      `SELECT d.id, d.cluster, d.casa, d.referencia, d.activo, d.cliente_id,
              c.nombre AS nombre_cliente, c.telefono, c.nit
       FROM dbo.direcciones d
       JOIN dbo.clientes c ON c.id = d.cliente_id
       WHERE d.activo = 1
         AND (@buscar IS NULL
              OR d.cluster LIKE '%' + @buscar + '%'
              OR d.casa LIKE '%' + @buscar + '%'
              OR c.nombre LIKE '%' + @buscar + '%')
       ORDER BY d.cluster, d.casa`,
      { buscar: buscar || null }
    );
    const data = recordset.map((d) => ({
      ...d,
      etiqueta: `${d.cluster} · Casa ${d.casa} — ${d.nombre_cliente}`,
    }));
    res.json({ ok: true, data });
  })
);

/* Clusters existentes (para agrupar / autocompletar) */
router.get(
  '/clusters',
  asyncHandler(async (_req, res) => {
    const { recordset } = await query(
      `SELECT cluster, COUNT(*) AS casas FROM dbo.direcciones WHERE activo = 1 GROUP BY cluster ORDER BY cluster`
    );
    res.json({ ok: true, data: recordset });
  })
);

router.post(
  '/',
  permitirRoles('Administrador', 'Propietario', 'Empleado'),
  asyncHandler(async (req, res) => {
    const { cliente_id, cluster, casa, referencia } = req.body;
    if (!cliente_id) throw badRequest('Debe asociar la dirección a un cliente');
    if (!cluster || !casa) throw badRequest('Cluster y casa son obligatorios');
    const { recordset } = await query(
      `INSERT INTO dbo.direcciones (cliente_id, cluster, casa, referencia)
       OUTPUT INSERTED.id VALUES (@cliente_id, @cluster, @casa, @ref)`,
      { cliente_id, cluster, casa, ref: referencia || null }
    );
    res.status(201).json({ ok: true, id: recordset[0].id });
  })
);

router.put(
  '/:id',
  permitirRoles('Administrador', 'Propietario', 'Empleado'),
  asyncHandler(async (req, res) => {
    const existe = (await query('SELECT id FROM dbo.direcciones WHERE id = @id', { id: req.params.id })).recordset[0];
    if (!existe) throw notFound('Dirección no encontrada');
    const { cliente_id, cluster, casa, referencia, activo } = req.body;
    await query(
      `UPDATE dbo.direcciones SET cliente_id=@cliente_id, cluster=@cluster, casa=@casa,
              referencia=@ref, activo=@activo WHERE id=@id`,
      { id: req.params.id, cliente_id, cluster, casa, ref: referencia || null, activo: activo === false ? 0 : 1 }
    );
    res.json({ ok: true });
  })
);

router.delete(
  '/:id',
  permitirRoles('Administrador', 'Propietario'),
  asyncHandler(async (req, res) => {
    await query('UPDATE dbo.direcciones SET activo = 0 WHERE id = @id', { id: req.params.id });
    res.json({ ok: true });
  })
);

export default router;
