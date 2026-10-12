import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { autenticar, permitirRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { validarPassword } from '../utils/password.js';

const router = Router();

// Toda la gestión de usuarios requiere rol Administrador (HU-05).
router.use(autenticar, permitirRoles('Administrador'));

/* Listar roles disponibles */
router.get(
  '/roles',
  asyncHandler(async (_req, res) => {
    const { recordset } = await query('SELECT id, nombre, descripcion FROM dbo.roles ORDER BY id');
    res.json({ ok: true, data: recordset });
  })
);

/* Listar usuarios */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { recordset } = await query(
      `SELECT u.id, u.nombre, u.email, u.activo, u.ultimo_acceso, u.creado_en,
              r.nombre AS rol, r.id AS rol_id
       FROM dbo.usuarios u JOIN dbo.roles r ON r.id = u.rol_id
       ORDER BY u.nombre`
    );
    res.json({ ok: true, data: recordset });
  })
);

/* Crear usuario */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { nombre, email, password, rol_id } = req.body;
    if (!nombre || !email || !password || !rol_id)
      throw badRequest('Nombre, email, contraseña y rol son obligatorios');
    validarPassword(password);

    const hash = await bcrypt.hash(password, 10);
    const { recordset } = await query(
      `INSERT INTO dbo.usuarios (nombre, email, password_hash, rol_id, activo)
       OUTPUT INSERTED.id
       VALUES (@nombre, @email, @hash, @rol_id, 1)`,
      { nombre, email, hash, rol_id }
    );
    res.status(201).json({ ok: true, id: recordset[0].id });
  })
);

/* Actualizar usuario (datos, rol, estado y opcionalmente contraseña) */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nombre, email, rol_id, activo, password } = req.body;

    const existe = (await query('SELECT id FROM dbo.usuarios WHERE id = @id', { id })).recordset[0];
    if (!existe) throw notFound('Usuario no encontrado');

    let hash = null;
    if (password) {
      validarPassword(password);
      hash = await bcrypt.hash(password, 10);
    }

    await query(
      `UPDATE dbo.usuarios
       SET nombre = @nombre, email = @email, rol_id = @rol_id, activo = @activo
           ${hash ? ', password_hash = @hash' : ''}
       WHERE id = @id`,
      { id, nombre, email, rol_id, activo: activo ? 1 : 0, ...(hash ? { hash } : {}) }
    );
    res.json({ ok: true });
  })
);

/* Desactivar usuario (borrado lógico) */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await query('UPDATE dbo.usuarios SET activo = 0 WHERE id = @id', { id: req.params.id });
    res.json({ ok: true });
  })
);

export default router;
