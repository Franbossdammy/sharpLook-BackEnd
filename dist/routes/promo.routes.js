"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const promo_controller_1 = __importDefault(require("../controllers/promo.controller"));
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/v1/promo/current
 * @desc    Get the active promo campaign + user eligibility
 * @access  Public (auth optional; if provided, includes userEligible flag)
 */
router.get('/current', auth_1.optionalAuth, promo_controller_1.default.getCurrent);
/**
 * ==================== ADMIN ROUTES ====================
 */
/**
 * @route   GET /api/v1/promo/admin
 * @desc    List all promo campaigns
 * @access  Admin
 */
router.get('/admin', auth_1.authenticate, auth_1.requireAdmin, promo_controller_1.default.listCampaigns);
/**
 * @route   POST /api/v1/promo/admin
 * @desc    Create a new promo campaign
 * @access  Admin
 */
router.post('/admin', auth_1.authenticate, auth_1.requireAdmin, promo_controller_1.default.createCampaign);
/**
 * @route   GET /api/v1/promo/admin/:id/stats
 * @desc    Get stats for a promo campaign
 * @access  Admin
 */
router.get('/admin/:id/stats', auth_1.authenticate, auth_1.requireAdmin, promo_controller_1.default.getStats);
/**
 * @route   PATCH /api/v1/promo/admin/:id/pause
 * @desc    Pause or resume a promo campaign
 * @access  Admin
 */
router.patch('/admin/:id/pause', auth_1.authenticate, auth_1.requireAdmin, promo_controller_1.default.togglePause);
/**
 * @route   PATCH /api/v1/promo/admin/:id
 * @desc    Update a promo campaign
 * @access  Admin
 */
router.patch('/admin/:id', auth_1.authenticate, auth_1.requireAdmin, promo_controller_1.default.updateCampaign);
/**
 * @route   POST /api/v1/promo/admin/:id/clear-refunded
 * @desc    Clear refunded redemptions from a campaign (testing helper — bypasses
 *          the "refunded still counts" rule; do not use casually in prod)
 * @access  Admin
 */
router.post('/admin/:id/clear-refunded', auth_1.authenticate, auth_1.requireAdmin, promo_controller_1.default.clearRefunded);
exports.default = router;
//# sourceMappingURL=promo.routes.js.map