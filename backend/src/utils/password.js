import { badRequest } from './httpError.js';

/* ============================================================================
   Política de complejidad de contraseñas (RNF-06)
   ----------------------------------------------------------------------------
   Requisitos:
     - Mínimo 8 caracteres
     - Al menos una letra mayúscula
     - Al menos una letra minúscula
     - Al menos un número
   ============================================================================ */

export const REQUISITOS_PASSWORD =
  'La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número.';

/** Devuelve true si la contraseña cumple la política. */
export function cumpleComplejidad(password) {
  if (typeof password !== 'string' || password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

/** Lanza un error 400 con el mensaje de requisitos si la contraseña no cumple. */
export function validarPassword(password) {
  if (!cumpleComplejidad(password)) throw badRequest(REQUISITOS_PASSWORD);
}
