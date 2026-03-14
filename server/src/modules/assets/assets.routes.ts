import { Router } from 'express';
import { upload } from '../../middleware/upload';
import { uploadAsset, getAsset, deleteAsset } from './assets.controller';

const router = Router();

/**
 * @openapi
 * /api/assets/upload:
 *   post:
 *     tags: [Assets]
 *     summary: Upload a media asset
 *     description: >
 *       Accepts a multipart file upload (video, audio, or image).
 *       Stores the file on disk, probes it with FFmpeg for metadata,
 *       and generates a thumbnail strip for video files.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, projectId]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The media file to upload (max 2 GB)
 *               projectId:
 *                 type: string
 *                 description: The project this asset belongs to
 *     responses:
 *       200:
 *         description: Asset created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Asset'
 *       400:
 *         description: Missing file or projectId
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/upload', upload.single('file'), uploadAsset);

/**
 * @openapi
 * /api/assets/{id}:
 *   get:
 *     tags: [Assets]
 *     summary: Get a single asset by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Asset record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Asset'
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', getAsset);

/**
 * @openapi
 * /api/assets/{id}:
 *   delete:
 *     tags: [Assets]
 *     summary: Delete an asset
 *     description: Removes the asset record from the database and deletes the file from disk.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Asset deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', deleteAsset);

export default router;
