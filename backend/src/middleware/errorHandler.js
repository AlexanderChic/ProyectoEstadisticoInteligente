import { HttpError } from '../utils/httpError.js';

/** Middleware final: convierte errores en respuestas JSON uniformes. */
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ ok: false, error: err.message });
  }
  // Errores de SQL Server u otros no controlados
  console.error('Error no controlado:', err);
  const msg =
    err.number === 2627 || err.number === 2601
      ? 'Ya existe un registro con ese valor único.'
      : 'Error interno del servidor.';
  res.status(500).json({ ok: false, error: msg });
}

/** Middleware para rutas no encontradas. */
export function notFoundHandler(_req, res) {
  res.status(404).json({ ok: false, error: 'Ruta no encontrada' });
}
