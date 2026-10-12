import { Router } from 'express';
import { query } from '../config/db.js';
import { autenticar, permitirRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';

const router = Router();
router.use(autenticar);

/* Listar / buscar clientes (por nombre, teléfono o NIT) */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { buscar } = req.query;
    const { recordset } = await query(
      `SELECT c.id, c.nombre, c.telefono, c.nit, c.activo,
              (SELECT COUNT(*) FROM dbo.direcciones d WHERE d.cliente_id = c.id) AS direcciones
       FROM dbo.clientes c
       WHERE c.activo = 1
         AND (@buscar IS NULL OR c.nombre LIKE '%' + @buscar + '%'
              OR c.telefono LIKE '%' + @buscar + '%' OR c.nit LIKE '%' + @buscar + '%')
       ORDER BY c.nombre`,
      { buscar: buscar || null }
    );
    res.json({ ok: true, data: recordset });
  })
);

router.post(
  '/',
  permitirRoles('Administrador', 'Propietario', 'Empleado'),
  asyncHandler(async (req, res) => {
    const { nombre, telefono, nit } = req.body;
    if (!nombre) throw badRequest('El nombre del cliente es obligatorio');
    const { recordset } = await query(
      `INSERT INTO dbo.clientes (nombre, telefono, nit) OUTPUT INSERTED.id
       VALUES (@nombre, @telefono, @nit)`,
      { nombre, telefono: telefono || null, nit: nit || null }
    );
    res.status(201).json({ ok: true, id: recordset[0].id });
  })
);

router.put(
  '/:id',
  permitirRoles('Administrador', 'Propietario', 'Empleado'),
  asyncHandler(async (req, res) => {
    const existe = (await query('SELECT id FROM dbo.clientes WHERE id=@id', { id: req.params.id })).recordset[0];
    if (!existe) throw notFound('Cliente no encontrado');
    const { nombre, telefono, nit, activo } = req.body;
    await query(
      `UPDATE dbo.clientes SET nombre=@nombre, telefono=@telefono, nit=@nit, activo=@activo WHERE id=@id`,
      { id: req.params.id, nombre, telefono: telefono || null, nit: nit || null, activo: activo === false ? 0 : 1 }
    );
    res.json({ ok: true });
  })
);

router.delete(
  '/:id',
  permitirRoles('Administrador', 'Propietario'),
  asyncHandler(async (req, res) => {
    await query('UPDATE dbo.clientes SET activo = 0 WHERE id = @id', { id: req.params.id });
    res.json({ ok: true });
  })
);

export default router;
