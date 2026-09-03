"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const coupon_controller_1 = __importDefault(require("../controllers/coupon.controller"));
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
/**
 * @route   POST /api/v1/coupons/validate
 * @desc    Validate a coupon code and calculate discount
 * @access  Private (Client)
 * @body    { code: string, orderAmount: number }
 */
router.post('/validate', auth_1.authenticate, coupon_controller_1.default.validateCoupon);
/**
 * @route   GET /api/v1/coupons/admin/seed
 * @desc    Seed test coupons (DEV/TEST ONLY — remove in production)
 * @access  Public
 */
router.get('/admin/seed', coupon_controller_1.default.seedCoupons);
exports.default = router;
//# sourceMappingURL=coupon.routes.js.map