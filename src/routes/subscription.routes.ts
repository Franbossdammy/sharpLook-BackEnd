import { Router } from 'express';
import subscriptionController from '../controllers/subscription.controller';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { validate, validatePagination } from '../middlewares/validate';
import {
  createSubscriptionValidation,
  subscriptionIdValidation,
  changePlanValidation,
  getSubscriptionsValidation,
} from '../validations/subscription.validation';

const router = Router();

/**
 * @route   POST /api/v1/subscriptions
 * @desc    Create subscription (Vendor)
 * @access  Private (Vendor)
 */
router.post(
  '/',
  authenticate,
  validate(createSubscriptionValidation),
  subscriptionController.createSubscription
);

/**
 * @route   GET /api/v1/subscriptions/my-subscription
 * @desc    Get vendor's subscription
 * @access  Private (Vendor)
 */
router.get('/my-subscription', authenticate, subscriptionController.getMySubscription);

/**
 * @route   PUT /api/v1/subscriptions/:subscriptionId/cancel
 * @desc    Cancel subscription
 * @access  Private (Vendor)
 */
router.put(
  '/:subscriptionId/cancel',
  authenticate,
  validate(subscriptionIdValidation),
  subscriptionController.cancelSubscription
);

/**
 * @route   PUT /api/v1/subscriptions/:subscriptionId/change-plan
 * @desc    Change subscription plan
 * @access  Private (Vendor)
 */
router.put(
  '/:subscriptionId/change-plan',
  authenticate,
  validate([...subscriptionIdValidation, ...changePlanValidation]),
  subscriptionController.changeSubscriptionPlan
);

// Admin routes
/**
 * @route   GET /api/v1/subscriptions
 * @desc    Get all subscriptions (Admin)
 * @access  Private (Admin)
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  validatePagination,
  validate(getSubscriptionsValidation),
  subscriptionController.getAllSubscriptions
);

/**
 * @route   GET /api/v1/subscriptions/stats
 * @desc    Get subscription statistics (Admin)
 * @access  Private (Admin)
 */
router.get('/stats', authenticate, requireAdmin, subscriptionController.getSubscriptionStats);


/**
 * @route   POST /api/v1/subscriptions/:subscriptionId/pay
 * @desc    Pay for subscription using wallet
 * @access  Private (Vendor)
 */
router.post(
  '/:subscriptionId/pay',
  authenticate,
  validate(subscriptionIdValidation),
  subscriptionController.paySubscription
);

export default router;
