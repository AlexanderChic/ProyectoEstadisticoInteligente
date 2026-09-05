import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { unauthorized, forbidden } from '../utils/httpError.js';

/** Firma un token JWT para un usuario autenticado. */
export function firmarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

/** Middleware: exige un token JWT válido en el header Authorization. */
export function autenticar(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(unauthorized('Token no proporcionado'));
  try {
    req.usuario = jwt.verify(token, config.jwt.secret);
    next();
  } catch {
    next(unauthorized('Token inválido o expirado'));
  }
}

/** Middleware factory: exige que el usuario tenga uno de los roles indicados. */
export function permitirRoles(...roles) {
  return (req, _res, next) => {
    if (!req.usuario) return next(unauthorized());
    if (!roles.includes(req.usuario.rol)) {
      return next(forbidden('No tiene permisos para esta acción'));
    }
    next();
  };
}
