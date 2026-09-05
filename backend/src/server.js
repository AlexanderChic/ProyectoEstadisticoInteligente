import app from './app.js';
import { config } from './config/env.js';
import { getPool } from './config/db.js';

async function iniciar() {
  try {
    await getPool(); // Verifica conexión a la base de datos al arrancar
    app.listen(config.port, () => {
      console.log(`🚀 API escuchando en http://localhost:${config.port}`);
      console.log(`   Entorno: ${config.env}`);
      console.log(`   IA (Claude): ${config.ia.enabled ? 'habilitada' : 'deshabilitada (solo estadística local)'}`);
    });
  } catch (err) {
    console.error('No se pudo iniciar el servidor:', err.message);
    process.exit(1);
  }
}

iniciar();
