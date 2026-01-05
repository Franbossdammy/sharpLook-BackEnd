import { Router } from 'express';
import redFlagController from '../controllers/redFlag.controller';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// ==================== GET ROUTES ====================

/**
 * @route   GET /api/admin/red-flags
 * @desc    Get all red flags with filters
 * @access  Admin
 */
router.get('/', redFlagController.getRedFlags);

/**
 * @route   GET /api/admin/red-flags/stats
 * @desc    Get red flag statistics
 * @access  Admin
 */
router.get('/stats', redFlagController.getStats);

/**
 * @route   GET /api/admin/red-flags/top-users
 * @desc    Get users with most red flags
 * @access  Admin
 */
router.get('/top-users', redFlagController.getTopFlaggedUsers);

/**
 * @route   GET /api/admin/red-flags/types/summary
 * @desc    Get red flag types with descriptions
 * @access  Admin
 */
router.get('/types/summary', redFlagController.getTypesSummary);

/**
 * @route   GET /api/admin/red-flags/user/:userId
 * @desc    Get red flags for a specific user
 * @access  Admin
 */
router.get('/user/:userId', redFlagController.getRedFlagsByUser);

/**
 * @route   GET /api/admin/red-flags/:id
 * @desc    Get single red flag details
 * @access  Admin
 */
router.get('/:id', redFlagController.getRedFlagById);

// ==================== POST ROUTES ====================

/**
 * @route   POST /api/admin/red-flags/manual
 * @desc    Manually create a red flag
 * @access  Admin
 */
router.post('/manual', redFlagController.createManualRedFlag);

/**
 * @route   POST /api/admin/red-flags/:id/resolve
 * @desc    Resolve red flag with action
 * @access  Admin
 */
router.post('/:id/resolve', redFlagController.resolveRedFlag);

/**
 * @route   POST /api/admin/red-flags/:id/notes
 * @desc    Add note to red flag
 * @access  Admin
 */
router.post('/:id/notes', redFlagController.addNote);

// ==================== PATCH ROUTES ====================

/**
 * @route   PATCH /api/admin/red-flags/bulk/status
 * @desc    Bulk update red flag statuses
 * @access  Admin
 */
router.patch('/bulk/status', redFlagController.bulkUpdateStatus);

/**
 * @route   PATCH /api/admin/red-flags/:id/status
 * @desc    Update red flag status
 * @access  Admin
 */
router.patch('/:id/status', redFlagController.updateStatus);

/**
 * @route   PATCH /api/admin/red-flags/:id/assign
 * @desc    Assign red flag to admin
 * @access  Admin
 */
router.patch('/:id/assign', redFlagController.assignRedFlag);

export default router;