import { HttpError } from '../utils/httpError.js';

/** Middleware final: convierte errores en respuestas JSON uniformes. */
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ ok: false, error: err.message });
  }
  // JSON mal formado en el cuerpo de la petición (body inválido)
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && 'body' in err)) {
    return res.status(400).json({
      ok: false,
      error: 'El cuerpo de la petición no es un JSON válido. Revise el formato.',
    });
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
