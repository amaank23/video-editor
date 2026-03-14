import { Router } from 'express';
import { triggerExport, downloadExport } from './export.controller';

const router = Router();

/**
 * @openapi
 * /api/export/{projectId}:
 *   post:
 *     tags: [Export]
 *     summary: Trigger a video export
 *     description: >
 *       Starts a Remotion renderMedia job for the given project.
 *       Progress is streamed back via Server-Sent Events.
 *       **Full implementation in Phase 5** — returns 501 for now.
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: The project to export
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExportOptions'
 *     responses:
 *       200:
 *         description: Export job started; SSE stream follows
 *       501:
 *         description: Not yet implemented
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:projectId', triggerExport);

/**
 * @openapi
 * /api/export/download/{filename}:
 *   get:
 *     tags: [Export]
 *     summary: Download a completed export file
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Export filename returned by the export job
 *     responses:
 *       200:
 *         description: Binary MP4/WebM/GIF file
 *         content:
 *           video/mp4:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Export file not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/download/:filename', downloadExport);

export default router;
