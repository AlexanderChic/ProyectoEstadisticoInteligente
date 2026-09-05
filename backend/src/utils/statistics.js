/* ============================================================================
   Motor Estadístico Local (FEAT-07)
   ----------------------------------------------------------------------------
   Todos los cálculos se realizan localmente en Node.js, sin servicios externos.
   Incluye: estadística descriptiva, promedios móviles, análisis de tendencia
   (regresión lineal por mínimos cuadrados) y proyección de demanda.
   ============================================================================ */

/** Media aritmética. */
export function media(valores) {
  if (!valores.length) return 0;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

/** Mediana. */
export function mediana(valores) {
  if (!valores.length) return 0;
  const orden = [...valores].sort((a, b) => a - b);
  const mid = Math.floor(orden.length / 2);
  return orden.length % 2 ? orden[mid] : (orden[mid - 1] + orden[mid]) / 2;
}

/** Moda (puede devolver varios valores). */
export function moda(valores) {
  if (!valores.length) return [];
  const freq = new Map();
  let max = 0;
  for (const v of valores) {
    const c = (freq.get(v) || 0) + 1;
    freq.set(v, c);
    if (c > max) max = c;
  }
  if (max <= 1) return [];
  return [...freq.entries()].filter(([, c]) => c === max).map(([v]) => v);
}

/** Desviación estándar poblacional. */
export function desviacionEstandar(valores) {
  if (valores.length < 2) return 0;
  const m = media(valores);
  const varianza = valores.reduce((a, b) => a + (b - m) ** 2, 0) / valores.length;
  return Math.sqrt(varianza);
}

/** Percentil (0-100) por interpolación lineal. */
export function percentil(valores, p) {
  if (!valores.length) return 0;
  const orden = [...valores].sort((a, b) => a - b);
  const idx = (p / 100) * (orden.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return orden[lo];
  return orden[lo] + (orden[hi] - orden[lo]) * (idx - lo);
}

/** Resumen de estadística descriptiva de una serie numérica. */
export function estadisticaDescriptiva(valores) {
  return {
    n: valores.length,
    suma: valores.reduce((a, b) => a + b, 0),
    media: redondear(media(valores)),
    mediana: redondear(mediana(valores)),
    moda: moda(valores).map(redondear),
    minimo: valores.length ? Math.min(...valores) : 0,
    maximo: valores.length ? Math.max(...valores) : 0,
    desviacionEstandar: redondear(desviacionEstandar(valores)),
    coefVariacion: media(valores) ? redondear((desviacionEstandar(valores) / media(valores)) * 100) : 0,
    percentil25: redondear(percentil(valores, 25)),
    percentil75: redondear(percentil(valores, 75)),
  };
}

/**
 * Promedio móvil simple de ventana `ventana`. Devuelve un arreglo con el
 * promedio para cada punto donde hay suficientes datos (null antes de eso).
 */
export function promedioMovil(valores, ventana = 3) {
  const res = [];
  for (let i = 0; i < valores.length; i++) {
    if (i < ventana - 1) {
      res.push(null);
    } else {
      const slice = valores.slice(i - ventana + 1, i + 1);
      res.push(redondear(media(slice)));
    }
  }
  return res;
}

/**
 * Regresión lineal por mínimos cuadrados sobre puntos (x=índice, y=valor).
 * Devuelve pendiente, intercepto, coeficiente de determinación R² y la
 * dirección de la tendencia.
 */
export function tendenciaLineal(valores) {
  const n = valores.length;
  if (n < 2) return { pendiente: 0, intercepto: valores[0] || 0, r2: 0, direccion: 'estable' };

  const xs = valores.map((_, i) => i);
  const mx = media(xs);
  const my = media(valores);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (valores[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const pendiente = den === 0 ? 0 : num / den;
  const intercepto = my - pendiente * mx;

  // R²
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const pred = pendiente * xs[i] + intercepto;
    ssTot += (valores[i] - my) ** 2;
    ssRes += (valores[i] - pred) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  let direccion = 'estable';
  const umbral = my * 0.01; // 1% del promedio
  if (pendiente > umbral) direccion = 'creciente';
  else if (pendiente < -umbral) direccion = 'decreciente';

  return {
    pendiente: redondear(pendiente),
    intercepto: redondear(intercepto),
    r2: redondear(r2),
    direccion,
  };
}

/**
 * Proyección de demanda para los próximos `periodos` usando la recta de
 * tendencia. Los valores negativos se truncan a 0.
 */
export function proyectarDemanda(valores, periodos = 4) {
  const { pendiente, intercepto } = tendenciaLineal(valores);
  const n = valores.length;
  const proyeccion = [];
  for (let i = 0; i < periodos; i++) {
    const x = n + i;
    proyeccion.push(Math.max(0, redondear(pendiente * x + intercepto)));
  }
  return proyeccion;
}

/** Redondea a 2 decimales. */
export function redondear(v) {
  return Math.round((Number(v) + Number.EPSILON) * 100) / 100;
}
