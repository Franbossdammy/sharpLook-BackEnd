"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Coupon_1 = __importDefault(require("../models/Coupon"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
const errors_1 = require("../utils/errors");
class CouponController {
    constructor() {
        /**
         * Validate a coupon code before booking
         * @route  POST /api/v1/coupons/validate
         * @access Private (Client)
         * @body   { code: string, orderAmount: number }
         */
        this.validateCoupon = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { code, orderAmount } = req.body;
            const userId = req.user.id;
            if (!code || typeof code !== 'string') {
                throw new errors_1.BadRequestError('Coupon code is required');
            }
            if (orderAmount === undefined || orderAmount === null || isNaN(Number(orderAmount))) {
                throw new errors_1.BadRequestError('A valid order amount is required');
            }
            const amount = Number(orderAmount);
            if (amount < 0) {
                throw new errors_1.BadRequestError('Order amount cannot be negative');
            }
            // Find coupon case-insensitively
            const coupon = await Coupon_1.default.findOne({
                code: code.trim().toUpperCase(),
            });
            if (!coupon) {
                throw new errors_1.NotFoundError('Coupon code not found');
            }
            // Check if coupon is active
            if (!coupon.isActive) {
                throw new errors_1.BadRequestError('This coupon is no longer active');
            }
            // Check expiry
            if (new Date() > coupon.expiresAt) {
                throw new errors_1.BadRequestError('This coupon has expired');
            }
            // Check total usage limit
            if (coupon.maxUses !== null && coupon.maxUses !== undefined) {
                if (coupon.usedCount >= coupon.maxUses) {
                    throw new errors_1.BadRequestError('This coupon has reached its maximum usage limit');
                }
            }
            // Check per-user usage
            const userUsageCount = coupon.usedBy.filter((entry) => entry.user.toString() === userId).length;
            if (userUsageCount >= coupon.maxUsesPerUser) {
                throw new errors_1.BadRequestError(coupon.maxUsesPerUser === 1
                    ? 'You have already used this coupon'
                    : `You have already used this coupon ${userUsageCount} time(s) (max: ${coupon.maxUsesPerUser})`);
            }
            // Check minimum order amount
            if (amount < coupon.minOrderAmount) {
                throw new errors_1.BadRequestError(`Minimum order amount for this coupon is ₦${coupon.minOrderAmount.toLocaleString()}`);
            }
            // Calculate discount
            let discountAmount;
            if (coupon.discountType === 'flat') {
                // Flat discount cannot exceed the order amount
                discountAmount = Math.min(coupon.discountValue, amount);
            }
            else {
                // Percentage discount
                const rawDiscount = (coupon.discountValue / 100) * amount;
                const cap = coupon.maxDiscountAmount !== undefined && coupon.maxDiscountAmount !== null
                    ? coupon.maxDiscountAmount
                    : Infinity;
                discountAmount = Math.min(rawDiscount, cap);
            }
            discountAmount = Math.round(discountAmount * 100) / 100; // Round to 2 decimal places
            const finalAmount = Math.max(0, Math.round((amount - discountAmount) * 100) / 100);
            return response_1.default.success(res, 'Coupon applied successfully', {
                valid: true,
                couponId: coupon._id,
                code: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                discountAmount,
                finalAmount,
            });
        });
        /**
         * Seed test coupons (no auth — testing only, remove in prod)
         * @route  GET /api/v1/coupons/admin/seed
         * @access Public (DEV/TEST ONLY)
         */
        this.seedCoupons = (0, error_1.asyncHandler)(async (_req, res, _next) => {
            const seedData = [
                {
                    code: 'WELCOME10',
                    discountType: 'percentage',
                    discountValue: 10,
                    minOrderAmount: 0,
                    maxDiscountAmount: 5000,
                    maxUses: 100,
                    maxUsesPerUser: 1,
                    expiresAt: new Date('2027-01-01'),
                    isActive: true,
                },
                {
                    code: 'FLAT500',
                    discountType: 'flat',
                    discountValue: 500,
                    minOrderAmount: 2000,
                    maxUses: 50,
                    maxUsesPerUser: 1,
                    expiresAt: new Date('2027-01-01'),
                    isActive: true,
                },
                {
                    code: 'BEAUTY20',
                    discountType: 'percentage',
                    discountValue: 20,
                    minOrderAmount: 5000,
                    maxDiscountAmount: 10000,
                    maxUses: 30,
                    maxUsesPerUser: 1,
                    expiresAt: new Date('2027-01-01'),
                    isActive: true,
                },
                {
                    code: 'NEWUSER',
                    discountType: 'flat',
                    discountValue: 1000,
                    minOrderAmount: 3000,
                    maxUses: 200,
                    maxUsesPerUser: 1,
                    expiresAt: new Date('2027-01-01'),
                    isActive: true,
                },
                {
                    code: 'VIP50',
                    discountType: 'percentage',
                    discountValue: 50,
                    minOrderAmount: 10000,
                    maxDiscountAmount: 25000,
                    maxUses: 10,
                    maxUsesPerUser: 1,
                    expiresAt: new Date('2027-01-01'),
                    isActive: true,
                },
            ];
            const results = [];
            for (const data of seedData) {
                const existing = await Coupon_1.default.findOne({ code: data.code });
                if (existing) {
                    results.push({ code: data.code, status: 'already_exists', coupon: existing });
                }
                else {
                    const coupon = await Coupon_1.default.create(data);
                    results.push({ code: data.code, status: 'created', coupon });
                }
            }
            return response_1.default.success(res, 'Coupon seed complete', { results });
        });
    }
}
exports.default = new CouponController();
//# sourceMappingURL=coupon.controller.js.map