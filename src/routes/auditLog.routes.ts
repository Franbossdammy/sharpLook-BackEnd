import { Router } from 'express';
import auditLogController from '../controllers/auditLog.controller';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { validatePagination } from '../middlewares/validate';

const router = Router();

/**
 * @route   GET /api/v1/audit-logs
 * @desc    Get all audit logs
 * @access  Private (Admin)
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  validatePagination,
  auditLogController.getAll
);

/**
 * @route   GET /api/v1/audit-logs/:resource/:resourceId
 * @desc    Get audit logs for a specific resource
 * @access  Private (Admin)
 */
router.get(
  '/:resource/:resourceId',
  authenticate,
  requireAdmin,
  auditLogController.getByResource
);

export default router;
