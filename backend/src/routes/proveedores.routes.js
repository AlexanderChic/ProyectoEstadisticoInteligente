import { Router } from 'express';
import { query } from '../config/db.js';
import { autenticar, permitirRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';

const router = Router();
router.use(autenticar);

/* HU-17 · CRUD de proveedores */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { recordset } = await query(
      `SELECT id, nombre, contacto, telefono, email, direccion, activo FROM dbo.proveedores ORDER BY nombre`
    );
    res.json({ ok: true, data: recordset });
  })
);

router.post(
  '/',
  permitirRoles('Administrador', 'Propietario', 'Empleado'),
  asyncHandler(async (req, res) => {
    const { nombre, contacto, telefono, email, direccion } = req.body;
    if (!nombre) throw badRequest('El nombre es obligatorio');
    const { recordset } = await query(
      `INSERT INTO dbo.proveedores (nombre, contacto, telefono, email, direccion)
       OUTPUT INSERTED.id VALUES (@nombre, @contacto, @telefono, @email, @direccion)`,
      {
        nombre,
        contacto: contacto || null,
        telefono: telefono || null,
        email: email || null,
        direccion: direccion || null,
      }
    );
    res.status(201).json({ ok: true, id: recordset[0].id });
  })
);

router.put(
  '/:id',
  permitirRoles('Administrador', 'Propietario', 'Empleado'),
  asyncHandler(async (req, res) => {
    const existe = (await query('SELECT id FROM dbo.proveedores WHERE id=@id', { id: req.params.id }))
      .recordset[0];
    if (!existe) throw notFound('Proveedor no encontrado');
    const { nombre, contacto, telefono, email, direccion, activo } = req.body;
    await query(
      `UPDATE dbo.proveedores SET nombre=@nombre, contacto=@contacto, telefono=@telefono,
              email=@email, direccion=@direccion, activo=@activo WHERE id=@id`,
      {
        id: req.params.id,
        nombre,
        contacto: contacto || null,
        telefono: telefono || null,
        email: email || null,
        direccion: direccion || null,
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
    await query('UPDATE dbo.proveedores SET activo = 0 WHERE id = @id', { id: req.params.id });
    res.json({ ok: true });
  })
);

export default router;
