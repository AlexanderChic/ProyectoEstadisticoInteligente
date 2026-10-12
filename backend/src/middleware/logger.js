import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* ============================================================================
   Logger del sistema
   ----------------------------------------------------------------------------
   Registra eventos (especialmente fallos del servicio de IA y cambios de
   estado del Circuit Breaker) con marca de tiempo, en consola y en un archivo
   de log (backend/logs/sistema.log).
   ============================================================================ */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, '..', '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'sistema.log');

// Crea la carpeta de logs si no existe
try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
} catch {
  /* noop */
}

/**
 * Registra un evento con marca de tiempo.
 * @param {string} nivel  INFO | ADVERTENCIA | ERROR
 * @param {string} mensaje
 */
export function registrarEvento(nivel, mensaje) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const linea = `${ts} [${nivel}] ${mensaje}`;
  // Consola
  if (nivel === 'ERROR') console.error(linea);
  else console.log(linea);
  // Archivo (no bloquea si falla la escritura)
  try {
    fs.appendFile(LOG_FILE, linea + '\n', () => {});
  } catch {
    /* noop */
  }
}

/** Middleware opcional: registra cada petición HTTP entrante. */
export function loggerHttp(req, _res, next) {
  registrarEvento('INFO', `${req.method} ${req.originalUrl}`);
  next();
}
