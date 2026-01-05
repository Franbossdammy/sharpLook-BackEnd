"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const vendorAnalytics_controller_1 = __importDefault(require("../controllers/vendorAnalytics.controller"));
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/v1/analytics/vendor
 * @desc    Get comprehensive vendor analytics
 * @access  Private (Vendor)
 */
router.get('/vendor', auth_1.authenticate, vendorAnalytics_controller_1.default.getVendorAnalytics);
/**
 * @route   GET /api/v1/analytics/vendor/quick-stats
 * @desc    Get quick stats for vendor dashboard
 * @access  Private (Vendor)
 */
router.get('/vendor/quick-stats', auth_1.authenticate, vendorAnalytics_controller_1.default.getVendorQuickStats);
exports.default = router;
//# sourceMappingURL=vendorAnalytics.routes.js.map