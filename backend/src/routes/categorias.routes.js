import { Router } from 'express';
import { query } from '../config/db.js';
import { autenticar, permitirRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';

const router = Router();
router.use(autenticar);

/* Listar categorías */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { recordset } = await query(
      `SELECT c.id, c.nombre, c.descripcion, c.activo,
              (SELECT COUNT(*) FROM dbo.productos p WHERE p.categoria_id = c.id) AS productos
       FROM dbo.categorias c ORDER BY c.nombre`
    );
    res.json({ ok: true, data: recordset });
  })
);

/* Crear categoría */
router.post(
  '/',
  permitirRoles('Administrador', 'Propietario', 'Empleado'),
  asyncHandler(async (req, res) => {
    const { nombre, descripcion } = req.body;
    if (!nombre) throw badRequest('El nombre es obligatorio');
    const { recordset } = await query(
      `INSERT INTO dbo.categorias (nombre, descripcion) OUTPUT INSERTED.id VALUES (@nombre, @descripcion)`,
      { nombre, descripcion: descripcion || null }
    );
    res.status(201).json({ ok: true, id: recordset[0].id });
  })
);

/* Actualizar categoría */
router.put(
  '/:id',
  permitirRoles('Administrador', 'Propietario', 'Empleado'),
  asyncHandler(async (req, res) => {
    const { nombre, descripcion, activo } = req.body;
    const existe = (await query('SELECT id FROM dbo.categorias WHERE id = @id', { id: req.params.id }))
      .recordset[0];
    if (!existe) throw notFound('Categoría no encontrada');
    await query(
      `UPDATE dbo.categorias SET nombre = @nombre, descripcion = @descripcion, activo = @activo WHERE id = @id`,
      { id: req.params.id, nombre, descripcion: descripcion || null, activo: activo === false ? 0 : 1 }
    );
    res.json({ ok: true });
  })
);

/* Eliminar categoría (lógico) */
router.delete(
  '/:id',
  permitirRoles('Administrador', 'Propietario'),
  asyncHandler(async (req, res) => {
    await query('UPDATE dbo.categorias SET activo = 0 WHERE id = @id', { id: req.params.id });
    res.json({ ok: true });
  })
);

export default router;
