import { Router } from 'express';
import { getProjects, postProject, getProject, putProject, deleteProjectById } from './projects.controller';

const router = Router();

/**
 * @openapi
 * /api/projects:
 *   get:
 *     tags: [Projects]
 *     summary: List all projects
 *     description: Returns all projects ordered by last updated, with asset count.
 *     responses:
 *       200:
 *         description: Array of projects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Project'
 *                   - type: object
 *                     properties:
 *                       _count:
 *                         type: object
 *                         properties:
 *                           assets:
 *                             type: integer
 */
router.get('/', getProjects);

/**
 * @openapi
 * /api/projects:
 *   post:
 *     tags: [Projects]
 *     summary: Create a new project
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: My Video
 *               settings:
 *                 $ref: '#/components/schemas/ProjectSettings'
 *     responses:
 *       201:
 *         description: Project created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 */
router.post('/', postProject);

/**
 * @openapi
 * /api/projects/{id}:
 *   get:
 *     tags: [Projects]
 *     summary: Get a project with all tracks, clips, and assets
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Full project object
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Project'
 *                 - type: object
 *                   properties:
 *                     tracks:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/Track'
 *                           - type: object
 *                             properties:
 *                               clips:
 *                                 type: array
 *                                 items:
 *                                   $ref: '#/components/schemas/Clip'
 *                     assets:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Asset'
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', getProject);

/**
 * @openapi
 * /api/projects/{id}:
 *   put:
 *     tags: [Projects]
 *     summary: Update project metadata (auto-save)
 *     description: Used by the client auto-save hook to persist project name and settings changes.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               settings:
 *                 $ref: '#/components/schemas/ProjectSettings'
 *     responses:
 *       200:
 *         description: Updated project
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', putProject);

/**
 * @openapi
 * /api/projects/{id}:
 *   delete:
 *     tags: [Projects]
 *     summary: Delete a project and all its tracks, clips, and assets
 *     description: Cascades deletion to tracks, clips, and asset DB records (files on disk are also removed).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', deleteProjectById);

export default router;
