"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubscriptionsValidation = exports.changePlanValidation = exports.subscriptionIdValidation = exports.createSubscriptionValidation = void 0;
const express_validator_1 = require("express-validator");
exports.createSubscriptionValidation = [
    (0, express_validator_1.body)('plan')
        .isIn(['in_shop', 'home_service', 'both'])
        .withMessage('Invalid subscription plan'),
];
exports.subscriptionIdValidation = [
    (0, express_validator_1.param)('subscriptionId').isMongoId().withMessage('Invalid subscription ID'),
];
exports.changePlanValidation = [
    (0, express_validator_1.body)('plan')
        .isIn(['in_shop', 'home_service', 'both'])
        .withMessage('Invalid subscription plan'),
];
exports.getSubscriptionsValidation = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(['active', 'expired', 'cancelled', 'pending'])
        .withMessage('Invalid status'),
    (0, express_validator_1.query)('plan')
        .optional()
        .isIn(['in_shop', 'home_service', 'both'])
        .withMessage('Invalid plan'),
];
//# sourceMappingURL=subscription.validation.js.map