import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import apiRouter from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: config.corsOrigin.split(',').map((o) => o.trim()) }));
app.use(express.json({ limit: '2mb' }));

// Salud del servicio
app.get('/health', (_req, res) => res.json({ ok: true, status: 'up', ts: new Date().toISOString() }));

// API
app.use('/api', apiRouter);

// 404 y manejo de errores
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
