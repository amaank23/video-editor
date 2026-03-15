import { Router } from 'express';
import { triggerExport, getExportStatus, downloadExport } from './export.controller';

const router = Router();

router.post('/:projectId', triggerExport);
router.get('/status/:jobId', getExportStatus);
router.get('/download/:jobId', downloadExport);

export default router;
