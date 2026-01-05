"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const subscription_service_1 = __importDefault(require("../services/subscription.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
class SubscriptionController {
    constructor() {
        this.createSubscription = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const vendorId = req.user.id;
            const { plan } = req.body;
            const subscription = await subscription_service_1.default.createSubscription(vendorId, plan);
            return response_1.default.created(res, 'Subscription created', { subscription });
        });
        this.getMySubscription = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const vendorId = req.user.id;
            const subscription = await subscription_service_1.default.getVendorSubscription(vendorId);
            return response_1.default.success(res, 'Subscription retrieved', { subscription });
        });
        this.paySubscription = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { subscriptionId } = req.params;
            // const vendorId = req.user!.id;
            const { paymentReference } = req.body;
            const subscription = await subscription_service_1.default.paySubscription(subscriptionId, paymentReference || `SUB-${Date.now()}`);
            return response_1.default.success(res, 'Subscription payment successful', { subscription });
        });
        this.cancelSubscription = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { subscriptionId } = req.params;
            const vendorId = req.user.id;
            const subscription = await subscription_service_1.default.cancelSubscription(subscriptionId, vendorId);
            return response_1.default.success(res, 'Subscription cancelled', { subscription });
        });
        this.changeSubscriptionPlan = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { subscriptionId } = req.params;
            const vendorId = req.user.id;
            const { plan } = req.body;
            const subscription = await subscription_service_1.default.changeSubscriptionPlan(subscriptionId, vendorId, plan);
            return response_1.default.success(res, 'Subscription plan changed', { subscription });
        });
        // Admin endpoints
        this.getAllSubscriptions = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = {
                status: req.query.status,
                plan: req.query.plan,
            };
            const result = await subscription_service_1.default.getAllSubscriptions(filters, page, limit);
            return response_1.default.paginated(res, 'Subscriptions retrieved', result.subscriptions, page, limit, result.total);
        });
        this.getSubscriptionStats = (0, error_1.asyncHandler)(async (_req, res, _next) => {
            const stats = await subscription_service_1.default.getSubscriptionStats();
            return response_1.default.success(res, 'Subscription stats retrieved', { stats });
        });
    }
}
exports.default = new SubscriptionController();
//# sourceMappingURL=subscription.controller.js.map