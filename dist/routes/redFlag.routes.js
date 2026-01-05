"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const redFlag_controller_1 = __importDefault(require("../controllers/redFlag.controller"));
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// All routes require authentication and admin role
router.use(auth_1.authenticate);
router.use(auth_1.requireAdmin);
// ==================== GET ROUTES ====================
/**
 * @route   GET /api/admin/red-flags
 * @desc    Get all red flags with filters
 * @access  Admin
 */
router.get('/', redFlag_controller_1.default.getRedFlags);
/**
 * @route   GET /api/admin/red-flags/stats
 * @desc    Get red flag statistics
 * @access  Admin
 */
router.get('/stats', redFlag_controller_1.default.getStats);
/**
 * @route   GET /api/admin/red-flags/top-users
 * @desc    Get users with most red flags
 * @access  Admin
 */
router.get('/top-users', redFlag_controller_1.default.getTopFlaggedUsers);
/**
 * @route   GET /api/admin/red-flags/types/summary
 * @desc    Get red flag types with descriptions
 * @access  Admin
 */
router.get('/types/summary', redFlag_controller_1.default.getTypesSummary);
/**
 * @route   GET /api/admin/red-flags/user/:userId
 * @desc    Get red flags for a specific user
 * @access  Admin
 */
router.get('/user/:userId', redFlag_controller_1.default.getRedFlagsByUser);
/**
 * @route   GET /api/admin/red-flags/:id
 * @desc    Get single red flag details
 * @access  Admin
 */
router.get('/:id', redFlag_controller_1.default.getRedFlagById);
// ==================== POST ROUTES ====================
/**
 * @route   POST /api/admin/red-flags/manual
 * @desc    Manually create a red flag
 * @access  Admin
 */
router.post('/manual', redFlag_controller_1.default.createManualRedFlag);
/**
 * @route   POST /api/admin/red-flags/:id/resolve
 * @desc    Resolve red flag with action
 * @access  Admin
 */
router.post('/:id/resolve', redFlag_controller_1.default.resolveRedFlag);
/**
 * @route   POST /api/admin/red-flags/:id/notes
 * @desc    Add note to red flag
 * @access  Admin
 */
router.post('/:id/notes', redFlag_controller_1.default.addNote);
// ==================== PATCH ROUTES ====================
/**
 * @route   PATCH /api/admin/red-flags/bulk/status
 * @desc    Bulk update red flag statuses
 * @access  Admin
 */
router.patch('/bulk/status', redFlag_controller_1.default.bulkUpdateStatus);
/**
 * @route   PATCH /api/admin/red-flags/:id/status
 * @desc    Update red flag status
 * @access  Admin
 */
router.patch('/:id/status', redFlag_controller_1.default.updateStatus);
/**
 * @route   PATCH /api/admin/red-flags/:id/assign
 * @desc    Assign red flag to admin
 * @access  Admin
 */
router.patch('/:id/assign', redFlag_controller_1.default.assignRedFlag);
exports.default = router;
//# sourceMappingURL=redFlag.routes.js.map