"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const subscription_controller_1 = __importDefault(require("../controllers/subscription.controller"));
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const subscription_validation_1 = require("../validations/subscription.validation");
const router = (0, express_1.Router)();
/**
 * @route   POST /api/v1/subscriptions
 * @desc    Create subscription (Vendor)
 * @access  Private (Vendor)
 */
router.post('/', auth_1.authenticate, (0, validate_1.validate)(subscription_validation_1.createSubscriptionValidation), subscription_controller_1.default.createSubscription);
/**
 * @route   GET /api/v1/subscriptions/my-subscription
 * @desc    Get vendor's subscription
 * @access  Private (Vendor)
 */
router.get('/my-subscription', auth_1.authenticate, subscription_controller_1.default.getMySubscription);
/**
 * @route   PUT /api/v1/subscriptions/:subscriptionId/cancel
 * @desc    Cancel subscription
 * @access  Private (Vendor)
 */
router.put('/:subscriptionId/cancel', auth_1.authenticate, (0, validate_1.validate)(subscription_validation_1.subscriptionIdValidation), subscription_controller_1.default.cancelSubscription);
/**
 * @route   PUT /api/v1/subscriptions/:subscriptionId/change-plan
 * @desc    Change subscription plan
 * @access  Private (Vendor)
 */
router.put('/:subscriptionId/change-plan', auth_1.authenticate, (0, validate_1.validate)([...subscription_validation_1.subscriptionIdValidation, ...subscription_validation_1.changePlanValidation]), subscription_controller_1.default.changeSubscriptionPlan);
// Admin routes
/**
 * @route   GET /api/v1/subscriptions
 * @desc    Get all subscriptions (Admin)
 * @access  Private (Admin)
 */
router.get('/', auth_1.authenticate, auth_1.requireAdmin, validate_1.validatePagination, (0, validate_1.validate)(subscription_validation_1.getSubscriptionsValidation), subscription_controller_1.default.getAllSubscriptions);
/**
 * @route   GET /api/v1/subscriptions/stats
 * @desc    Get subscription statistics (Admin)
 * @access  Private (Admin)
 */
router.get('/stats', auth_1.authenticate, auth_1.requireAdmin, subscription_controller_1.default.getSubscriptionStats);
/**
 * @route   POST /api/v1/subscriptions/:subscriptionId/pay
 * @desc    Pay for subscription using wallet
 * @access  Private (Vendor)
 */
router.post('/:subscriptionId/pay', auth_1.authenticate, (0, validate_1.validate)(subscription_validation_1.subscriptionIdValidation), subscription_controller_1.default.paySubscription);
exports.default = router;
//# sourceMappingURL=subscription.routes.js.map