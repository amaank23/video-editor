import { Router } from 'express';
import { triggerExport, getExportStatus, downloadExport } from './export.controller';

const router = Router();

router.get('/status/:jobId', getExportStatus);
router.get('/download/:jobId', downloadExport);
router.post('/:projectId', triggerExport);

export default router;
