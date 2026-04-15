import { Router } from 'express';
import appConfigController from '../controllers/appConfig.controller';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

// Public — mobile app checks this on launch
router.get('/version', appConfigController.getVersion);

// Admin only — update version settings from the dashboard
router.patch('/version', authenticate, requireAdmin, appConfigController.updateVersion);

export default router;
