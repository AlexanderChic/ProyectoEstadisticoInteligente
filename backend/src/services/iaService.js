import { config } from '../config/env.js';

/* ============================================================================
   Servicio de IA (Claude API) - FEAT-09
   ----------------------------------------------------------------------------
   Complementa el motor estadístico local con sugerencias cualitativas en
   lenguaje natural (mejoras, oportunidades comerciales, riesgos) que no se
   obtienen solo con cálculos. Es OPCIONAL: si no hay ANTHROPIC_API_KEY,
   `iaDisponible()` devuelve false y el sistema opera solo con estadística.
   ============================================================================ */

export function iaDisponible() {
  return config.ia.enabled;
}

/**
 * Genera insights de negocio a partir de un resumen estadístico ya calculado.
 * @param {object} contexto Datos agregados (productos, tendencias, ventas...).
 * @returns {Promise<string>} Texto con recomendaciones en español.
 */
export async function generarInsights(contexto) {
  if (!iaDisponible()) {
    throw new Error('IA no configurada: defina ANTHROPIC_API_KEY en .env');
  }

  const prompt = `Eres un asesor comercial experto en distribuidoras de productos de consumo masivo en Guatemala.
Con base en estos datos estadísticos ya calculados de la distribuidora, entrega recomendaciones prácticas y accionables.
No repitas los números crudos: interprétalos. Enfócate en oportunidades de mejora, riesgos de inventario y decisiones de compra.
Responde en español, en viñetas concisas (máximo 6), tono profesional y directo.

DATOS:
${JSON.stringify(contexto, null, 2)}`;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
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
    throw new Error(`Error de la API de IA (${resp.status}): ${detalle.slice(0, 200)}`);
  }

  const data = await resp.json();
  return data?.content?.[0]?.text?.trim() || 'Sin respuesta de la IA.';
}
