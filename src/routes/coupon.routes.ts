import { Router } from 'express';
import couponController from '../controllers/coupon.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

/**
 * @route   POST /api/v1/coupons/validate
 * @desc    Validate a coupon code and calculate discount
 * @access  Private (Client)
 * @body    { code: string, orderAmount: number }
 */
router.post('/validate', authenticate, couponController.validateCoupon);

/**
 * @route   GET /api/v1/coupons/admin/seed
 * @desc    Seed test coupons (DEV/TEST ONLY — remove in production)
 * @access  Public
 */
router.get('/admin/seed', couponController.seedCoupons);

export default router;
