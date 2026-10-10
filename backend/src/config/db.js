import sql from 'mssql';
import { config } from './env.js';

/**
 * Pool de conexiones a SQL Server. Un único pool compartido por toda la app.
 * La conexión se configura por variables de entorno para ser portable a la nube
 * (Azure SQL Database) sin cambiar código.
 */
const poolConfig = {
  server: config.db.server.includes('\\') ? config.db.server.split('\\')[0] : config.db.server,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  options: {
    encrypt: config.db.encrypt,
    trustServerCertificate: config.db.trustServerCertificate,
    // Nombre de instancia (ej: SQLEXPRESS) si el servidor viene como host\instancia
    ...(config.db.server.includes('\\')
      ? { instanceName: config.db.server.split('\\')[1] }
      : { port: config.db.port }),
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

let poolPromise = null;

/** Devuelve (creando si es necesario) el pool de conexiones conectado. */
export async function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(poolConfig)
      .connect()
      .then((pool) => {
        console.log('✅ Conectado a SQL Server:', config.db.database);
        return pool;
      })
      .catch((err) => {
        poolPromise = null;
        console.error('❌ Error conectando a SQL Server:', err.message);
        throw err;
      });
  }
  return poolPromise;
}

/**
 * Helper para ejecutar consultas parametrizadas de forma segura (previene
 * inyección SQL). params es un objeto { nombre: valor }.
 */
export async function query(text, params = {}) {
  const pool = await getPool();
  const request = pool.request();
  for (const [key, value] of Object.entries(params)) {
    // Los strings se envían como NVARCHAR (Unicode) para preservar tildes y ñ.
    if (typeof value === 'string') request.input(key, sql.NVarChar, value);
    else request.input(key, value);
  }
  return request.query(text);
}

export { sql };
