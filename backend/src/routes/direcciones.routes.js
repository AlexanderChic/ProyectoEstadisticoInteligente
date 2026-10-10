import { Router } from 'express';
import { query } from '../config/db.js';
import { autenticar, permitirRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';

const router = Router();
router.use(autenticar);

/* Búsqueda rápida de direcciones (Cluster / Casa / cliente) para la venta. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { buscar } = req.query;
    const { recordset } = await query(
      `SELECT id, cluster, casa, nombre_cliente, referencia, activo
       FROM dbo.direcciones
       WHERE activo = 1
         AND (@buscar IS NULL
              OR cluster LIKE '%' + @buscar + '%'
              OR casa LIKE '%' + @buscar + '%'
              OR nombre_cliente LIKE '%' + @buscar + '%')
       ORDER BY cluster, casa`,
      { buscar: buscar || null }
    );
    // etiqueta lista para el dropdown
    const data = recordset.map((d) => ({
      ...d,
      etiqueta: `${d.cluster} · Casa ${d.casa}${d.nombre_cliente ? ' — ' + d.nombre_cliente : ''}`,
    }));
    res.json({ ok: true, data });
  })
);

/* Lista de clusters existentes (para agrupar / autocompletar) */
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
    const { cluster, casa, nombre_cliente, referencia } = req.body;
    if (!cluster || !casa) throw badRequest('Cluster y casa son obligatorios');
    const { recordset } = await query(
      `INSERT INTO dbo.direcciones (cluster, casa, nombre_cliente, referencia)
       OUTPUT INSERTED.id VALUES (@cluster, @casa, @nombre, @ref)`,
      { cluster, casa, nombre: nombre_cliente || null, ref: referencia || null }
    );
    res.status(201).json({ ok: true, id: recordset[0].id });
  })
);

router.put(
  '/:id',
  permitirRoles('Administrador', 'Propietario', 'Empleado'),
  asyncHandler(async (req, res) => {
    const existe = (await query('SELECT id FROM dbo.direcciones WHERE id = @id', { id: req.params.id }))
      .recordset[0];
    if (!existe) throw notFound('Dirección no encontrada');
    const { cluster, casa, nombre_cliente, referencia, activo } = req.body;
    await query(
      `UPDATE dbo.direcciones SET cluster=@cluster, casa=@casa, nombre_cliente=@nombre,
              referencia=@ref, activo=@activo WHERE id=@id`,
      {
        id: req.params.id,
        cluster,
        casa,
        nombre: nombre_cliente || null,
        ref: referencia || null,
        activo: activo === false ? 0 : 1,
      }
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
