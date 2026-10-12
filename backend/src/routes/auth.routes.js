import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { query, sql } from '../config/db.js';
import { firmarToken, autenticar } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, unauthorized, notFound, conflict } from '../utils/httpError.js';
import { validarPassword } from '../utils/password.js';

const router = Router();

/* HU-04 · Login y autenticación de usuario */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) throw badRequest('Email y contraseña son obligatorios');

    const { recordset } = await query(
      `SELECT u.id, u.nombre, u.email, u.password_hash, u.activo, r.nombre AS rol
       FROM dbo.usuarios u JOIN dbo.roles r ON r.id = u.rol_id
       WHERE u.email = @email`,
      { email }
    );
    const usuario = recordset[0];
    if (!usuario) throw unauthorized('Credenciales incorrectas');
    if (!usuario.activo) throw unauthorized('Usuario inactivo. Contacte al administrador.');

    const valido = await bcrypt.compare(password, usuario.password_hash);
    if (!valido) throw unauthorized('Credenciales incorrectas');

    await query('UPDATE dbo.usuarios SET ultimo_acceso = SYSDATETIME() WHERE id = @id', {
      id: usuario.id,
    });

    const token = firmarToken(usuario);
    res.json({
      ok: true,
      token,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
    });
  })
);

/* Datos del usuario autenticado */
router.get(
  '/me',
  autenticar,
  asyncHandler(async (req, res) => {
    res.json({ ok: true, usuario: req.usuario });
  })
);

/* Renueva el token (ventana deslizante): mientras el usuario esté activo, el
   frontend llama a este endpoint y la sesión se mantiene. Si no hay actividad,
   el token caduca a los 20 minutos y la sesión expira. */
router.get(
  '/refresh',
  autenticar,
  asyncHandler(async (req, res) => {
    const token = firmarToken({
      id: req.usuario.id,
      nombre: req.usuario.nombre,
      email: req.usuario.email,
      rol: req.usuario.rol,
    });
    res.json({ ok: true, token });
  })
);

/* Bootstrap: crea el PRIMER administrador solo si no existen usuarios. */
router.post(
  '/setup',
  asyncHandler(async (req, res) => {
    const { count } = (await query('SELECT COUNT(*) AS count FROM dbo.usuarios')).recordset[0];
    if (count > 0) throw conflict('El sistema ya fue inicializado.');

    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) throw badRequest('Nombre, email y contraseña son obligatorios');
    validarPassword(password);

    const rol = (await query("SELECT id FROM dbo.roles WHERE nombre = 'Administrador'")).recordset[0];
    const hash = await bcrypt.hash(password, 10);
    await query(
      `INSERT INTO dbo.usuarios (nombre, email, password_hash, rol_id, activo)
       VALUES (@nombre, @email, @hash, @rol, 1)`,
      { nombre, email, hash, rol: rol.id }
    );
    res.status(201).json({ ok: true, mensaje: 'Administrador inicial creado. Ya puede iniciar sesión.' });
  })
);

/* HU-06 · Recuperación de contraseña — solicitud (genera token). */
router.post(
  '/recuperar',
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) throw badRequest('Email es obligatorio');

    const usuario = (await query('SELECT id FROM dbo.usuarios WHERE email = @email', { email }))
      .recordset[0];

    // Respuesta uniforme para no revelar si el email existe.
    if (usuario) {
      const token = crypto.randomBytes(24).toString('hex');
      await query(
        `UPDATE dbo.usuarios
         SET reset_token = @token, reset_expira = DATEADD(HOUR, 1, SYSDATETIME())
         WHERE id = @id`,
        { token, id: usuario.id }
      );
      // En un entorno real se enviaría por correo. Para el proyecto se retorna
      // el token para poder completar el flujo de reseteo.
      return res.json({
        ok: true,
        mensaje: 'Si el correo existe, se generó un enlace de recuperación.',
        token_desarrollo: token,
      });
    }
    res.json({ ok: true, mensaje: 'Si el correo existe, se generó un enlace de recuperación.' });
  })
);

/* HU-06 · Recuperación de contraseña — confirmación con token. */
router.post(
  '/restablecer',
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) throw badRequest('Token y nueva contraseña son obligatorios');
    validarPassword(password);

    const usuario = (
      await query(
        `SELECT id FROM dbo.usuarios
         WHERE reset_token = @token AND reset_expira > SYSDATETIME()`,
        { token }
      )
    ).recordset[0];
    if (!usuario) throw notFound('Token inválido o expirado');

    const hash = await bcrypt.hash(password, 10);
    await query(
      `UPDATE dbo.usuarios
       SET password_hash = @hash, reset_token = NULL, reset_expira = NULL
       WHERE id = @id`,
      { hash, id: usuario.id }
    );
    res.json({ ok: true, mensaje: 'Contraseña actualizada correctamente.' });
  })
);

export default router;
