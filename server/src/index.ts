import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { ensureDirs, cleanOldExports } from './services/storage';
import assetsRouter from './routes/assets';
import projectsRouter from './routes/projects';
import exportRouter from './routes/export';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:3000';
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';

// Ensure upload and export directories exist
ensureDirs();

// Clean old exports every hour
setInterval(cleanOldExports, 60 * 60 * 1000);

// Middleware
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploaded media
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

// Routes
app.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use('/api/assets', assetsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/export', exportRouter);

// Global error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[server] Running at http://localhost:${PORT}`);
  console.log(`[server] Accepting requests from ${CLIENT_URL}`);
});

export default app;
