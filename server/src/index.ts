import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { ensureDirs, cleanOldExports } from './shared/storage';
import assetsRouter from './modules/assets/assets.routes';
import projectsRouter from './modules/projects/projects.routes';
import exportRouter from './modules/export/export.routes';
import { errorHandler } from './middleware/errorHandler';
import { swaggerSpec } from './openapi/spec';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:3000';
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';

ensureDirs();
setInterval(cleanOldExports, 60 * 60 * 1000);

// Middleware
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploaded media
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

// Swagger UI — available at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Video Editor API Docs',
  swaggerOptions: { persistAuthorization: true },
}));

// Expose raw OpenAPI JSON for tooling (Postman, code-gen, etc.)
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes
app.get('/health', (_req, res) => {
  /**
   * @openapi
   * /health:
   *   get:
   *     tags: [Health]
   *     summary: Health check
   *     responses:
   *       200:
   *         description: Server is running
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 ok:
   *                   type: boolean
   *                   example: true
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   */
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use('/api/assets', assetsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/export', exportRouter);

// Global error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[server] Running at http://localhost:${PORT}`);
  console.log(`[server] API Docs:  http://localhost:${PORT}/api-docs`);
  console.log(`[server] OpenAPI JSON: http://localhost:${PORT}/api-docs.json`);
  console.log(`[server] Accepting requests from ${CLIENT_URL}`);
});

export default app;
