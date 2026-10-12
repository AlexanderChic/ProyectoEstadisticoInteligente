import { config } from '../config/env.js';
import { registrarEvento } from '../middleware/logger.js';

/* ============================================================================
   Servicio de IA (Claude API) con patrón CIRCUIT BREAKER - FEAT-09 / RNF-05
   ----------------------------------------------------------------------------
   Complementa el motor estadístico local con sugerencias cualitativas. Como
   depende de un servicio externo (API de IA) sobre el que no se tiene control,
   se protege con el patrón Circuit Breaker + degradación elegante:

     - CERRADO     : las llamadas pasan normalmente.
     - ABIERTO     : tras N fallos consecutivos, se "abre" y responde al
                     instante {disponible:false} sin llamar a la API, durante
                     un tiempo de enfriamiento.
     - SEMIABIERTO : pasado el enfriamiento, deja pasar UNA llamada de prueba;
                     si funciona vuelve a CERRADO, si falla regresa a ABIERTO.

   El endpoint SIEMPRE responde (dato real o {disponible:false, mensaje}),
   por lo que la interfaz nunca queda colgada y los módulos transaccionales
   (ventas, inventario, compras) no se ven afectados.
   ============================================================================ */

// ---- Parámetros del Circuit Breaker ----
const UMBRAL_FALLOS = 3; // fallos consecutivos para abrir el circuito
const ENFRIAMIENTO_MS = 5 * 60 * 1000; // 5 minutos abierto antes de reintentar
const TIMEOUT_MS = 8000; // 8 s de espera máxima por respuesta de la API

// ---- Estado del Circuit Breaker (en memoria) ----
const breaker = {
  estado: 'CERRADO', // 'CERRADO' | 'ABIERTO' | 'SEMIABIERTO'
  fallos: 0,
  abiertoDesde: 0,
};

export function iaDisponible() {
  return config.ia.enabled;
}

/** Devuelve el estado actual del Circuit Breaker (para monitoreo/diagnóstico). */
export function estadoBreaker() {
  return { ...breaker };
}

function abrirCircuito() {
  breaker.estado = 'ABIERTO';
  breaker.abiertoDesde = Date.now();
  registrarEvento('ADVERTENCIA', `Circuit Breaker ABIERTO tras ${breaker.fallos} fallos de la API de IA. Enfriamiento ${ENFRIAMIENTO_MS / 60000} min.`);
}

function registrarExito() {
  if (breaker.estado !== 'CERRADO') {
    registrarEvento('INFO', 'Circuit Breaker CERRADO: la API de IA volvió a responder.');
  }
  breaker.estado = 'CERRADO';
  breaker.fallos = 0;
}

function registrarFallo(motivo) {
  breaker.fallos += 1;
  registrarEvento('ERROR', `Fallo de la API de IA (${breaker.fallos}/${UMBRAL_FALLOS}): ${motivo}`);
  if (breaker.fallos >= UMBRAL_FALLOS) abrirCircuito();
}

/** Respuesta estándar de degradación elegante. */
function noDisponible(mensaje) {
  return {
    disponible: false,
    mensaje: mensaje || 'Analítica inteligente temporalmente no disponible. Las funciones operativas del sistema están activas.',
  };
}

/**
 * Genera insights con resiliencia. NUNCA lanza excepción: siempre devuelve
 * { disponible: true, insights } o { disponible: false, mensaje }.
 */
export async function generarInsightsResiliente(contexto) {
  if (!iaDisponible()) {
    return noDisponible('IA no configurada. Defina ANTHROPIC_API_KEY en el archivo .env del backend.');
  }

  // Si el circuito está ABIERTO, verificar si ya pasó el enfriamiento
  if (breaker.estado === 'ABIERTO') {
    if (Date.now() - breaker.abiertoDesde < ENFRIAMIENTO_MS) {
      return noDisponible(); // responde al instante, sin llamar a la API
    }
    breaker.estado = 'SEMIABIERTO'; // deja pasar una llamada de prueba
    registrarEvento('INFO', 'Circuit Breaker SEMIABIERTO: probando la API de IA.');
  }

  try {
    const insights = await llamarApiIA(contexto);
    registrarExito();
    return { disponible: true, insights };
  } catch (e) {
    registrarFallo(e.message);
    return noDisponible();
  }
}

/** Llamada real a la API de IA, con timeout de 8 s mediante AbortController. */
async function llamarApiIA(contexto) {
  const prompt = `Eres un asesor comercial experto en distribuidoras de productos de consumo masivo en Guatemala.
Con base en estos datos estadísticos ya calculados de la distribuidora, entrega recomendaciones prácticas y accionables.
No repitas los números crudos: interprétalos. Enfócate en oportunidades de mejora, riesgos de inventario y decisiones de compra.
Responde en español, en viñetas concisas (máximo 6), tono profesional y directo.

DATOS:
${JSON.stringify(contexto, null, 2)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.ia.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.ia.model,
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!resp.ok) {
      const detalle = await resp.text().catch(() => '');
      throw new Error(`HTTP ${resp.status}: ${detalle.slice(0, 120)}`);
    }
    const data = await resp.json();
    return data?.content?.[0]?.text?.trim() || 'Sin respuesta de la IA.';
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`Timeout: la API no respondió en ${TIMEOUT_MS / 1000} s`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
