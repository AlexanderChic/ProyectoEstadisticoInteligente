import dotenv from 'dotenv';
dotenv.config();

/** Configuración central leída desde variables de entorno (.env). */
export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  corsOrigin: process.env.CORS_ORIGIN || '*',

  db: {
    server: process.env.DB_SERVER || 'localhost\\SQLEXPRESS',
    database: process.env.DB_NAME || 'DistribuidoraDB',
    user: process.env.DB_USER || 'app_distribuidora',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'secreto_por_defecto_no_seguro',
    expiresIn: process.env.JWT_EXPIRES || '8h',
  },

  ia: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
    enabled: Boolean(process.env.ANTHROPIC_API_KEY),
  },
};
