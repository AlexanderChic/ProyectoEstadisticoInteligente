import api from './client.js';

/**
 * Busca un producto por código de barras y, si no lo encuentra, por SKU exacto.
 * Devuelve el producto o null si no existe.
 */
export async function buscarPorCodigo(codigo) {
  const cod = String(codigo).trim();
  if (!cod) return null;
  try {
    const { data } = await api.get(`/productos/barcode/${encodeURIComponent(cod)}`);
    return data.data;
  } catch (err) {
    if (err.response?.status !== 404) throw err;
  }
  // Fallback: búsqueda por SKU / nombre exacto
  const { data } = await api.get('/productos', { params: { buscar: cod } });
  return data.data.find((p) => p.sku === cod || p.codigo_barras === cod) || null;
}
