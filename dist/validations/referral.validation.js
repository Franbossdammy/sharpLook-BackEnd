"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminReferralsValidation = exports.getLeaderboardValidation = exports.getReferralsValidation = exports.referralIdValidation = exports.applyReferralCodeValidation = exports.validateReferralCodeValidation = void 0;
const express_validator_1 = require("express-validator");
exports.validateReferralCodeValidation = [
    (0, express_validator_1.body)('referralCode')
        .trim()
        .notEmpty()
        .withMessage('Referral code is required')
        .isLength({ min: 6, max: 10 })
        .withMessage('Referral code must be between 6 and 10 characters')
        .isAlphanumeric()
        .withMessage('Referral code must contain only letters and numbers')
        .toUpperCase(),
];
exports.applyReferralCodeValidation = [
    (0, express_validator_1.body)('referralCode')
        .trim()
        .notEmpty()
        .withMessage('Referral code is required')
        .isLength({ min: 6, max: 12 })
        .withMessage('Referral code must be 6-12 characters')
        .isAlphanumeric()
        .withMessage('Referral code must be alphanumeric'),
];
exports.referralIdValidation = [
    (0, express_validator_1.param)('referralId').isMongoId().withMessage('Invalid referral ID'),
];
exports.getReferralsValidation = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(['pending', 'completed', 'expired', 'cancelled'])
        .withMessage('Invalid status'),
];
exports.getLeaderboardValidation = [
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be 1-50'),
];
exports.getAdminReferralsValidation = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(['pending', 'completed', 'expired', 'cancelled'])
        .withMessage('Invalid status'),
    (0, express_validator_1.query)('startDate').optional().isISO8601().withMessage('Invalid start date'),
    (0, express_validator_1.query)('endDate').optional().isISO8601().withMessage('Invalid end date'),
];
//# sourceMappingURL=referral.validation.js.map