import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import Coupon from '../models/Coupon';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';
import { NotFoundError, BadRequestError } from '../utils/errors';

class CouponController {
  /**
   * Validate a coupon code before booking
   * @route  POST /api/v1/coupons/validate
   * @access Private (Client)
   * @body   { code: string, orderAmount: number }
   */
  public validateCoupon = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { code, orderAmount } = req.body;
      const userId = req.user!.id;

      if (!code || typeof code !== 'string') {
        throw new BadRequestError('Coupon code is required');
      }

      if (orderAmount === undefined || orderAmount === null || isNaN(Number(orderAmount))) {
        throw new BadRequestError('A valid order amount is required');
      }

      const amount = Number(orderAmount);

      if (amount < 0) {
        throw new BadRequestError('Order amount cannot be negative');
      }

      // Find coupon case-insensitively
      const coupon = await Coupon.findOne({
        code: code.trim().toUpperCase(),
      });

      if (!coupon) {
        throw new NotFoundError('Coupon code not found');
      }

      // Check if coupon is active
      if (!coupon.isActive) {
        throw new BadRequestError('This coupon is no longer active');
      }

      // Check expiry
      if (new Date() > coupon.expiresAt) {
        throw new BadRequestError('This coupon has expired');
      }

      // Check total usage limit
      if (coupon.maxUses !== null && coupon.maxUses !== undefined) {
        if (coupon.usedCount >= coupon.maxUses) {
          throw new BadRequestError('This coupon has reached its maximum usage limit');
        }
      }

      // Check per-user usage
      const userUsageCount = coupon.usedBy.filter(
        (entry) => entry.user.toString() === userId
      ).length;

      if (userUsageCount >= coupon.maxUsesPerUser) {
        throw new BadRequestError(
          coupon.maxUsesPerUser === 1
            ? 'You have already used this coupon'
            : `You have already used this coupon ${userUsageCount} time(s) (max: ${coupon.maxUsesPerUser})`
        );
      }

      // Check minimum order amount
      if (amount < coupon.minOrderAmount) {
        throw new BadRequestError(
          `Minimum order amount for this coupon is ₦${coupon.minOrderAmount.toLocaleString()}`
        );
      }

      // Calculate discount
      let discountAmount: number;

      if (coupon.discountType === 'flat') {
        // Flat discount cannot exceed the order amount
        discountAmount = Math.min(coupon.discountValue, amount);
      } else {
        // Percentage discount
        const rawDiscount = (coupon.discountValue / 100) * amount;
        const cap = coupon.maxDiscountAmount !== undefined && coupon.maxDiscountAmount !== null
          ? coupon.maxDiscountAmount
          : Infinity;
        discountAmount = Math.min(rawDiscount, cap);
      }

      discountAmount = Math.round(discountAmount * 100) / 100; // Round to 2 decimal places
      const finalAmount = Math.max(0, Math.round((amount - discountAmount) * 100) / 100);

      return ResponseHandler.success(res, 'Coupon applied successfully', {
        valid: true,
        couponId: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        finalAmount,
      });
    }
  );

  /**
   * Seed test coupons (no auth — testing only, remove in prod)
   * @route  GET /api/v1/coupons/admin/seed
   * @access Public (DEV/TEST ONLY)
   */
  public seedCoupons = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
      const seedData = [
        {
          code: 'WELCOME10',
          discountType: 'percentage' as const,
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
          discountType: 'flat' as const,
          discountValue: 500,
          minOrderAmount: 2000,
          maxUses: 50,
          maxUsesPerUser: 1,
          expiresAt: new Date('2027-01-01'),
          isActive: true,
        },
        {
          code: 'BEAUTY20',
          discountType: 'percentage' as const,
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
          discountType: 'flat' as const,
          discountValue: 1000,
          minOrderAmount: 3000,
          maxUses: 200,
          maxUsesPerUser: 1,
          expiresAt: new Date('2027-01-01'),
          isActive: true,
        },
        {
          code: 'VIP50',
          discountType: 'percentage' as const,
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
        const existing = await Coupon.findOne({ code: data.code });
        if (existing) {
          results.push({ code: data.code, status: 'already_exists', coupon: existing });
        } else {
          const coupon = await Coupon.create(data);
          results.push({ code: data.code, status: 'created', coupon });
        }
      }

      return ResponseHandler.success(res, 'Coupon seed complete', { results });
    }
  );
}

export default new CouponController();
