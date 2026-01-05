"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReviewsValidation = exports.serviceIdValidation = exports.userIdValidation = exports.reviewIdValidation = exports.hideReviewValidation = exports.flagReviewValidation = exports.voteHelpfulValidation = exports.respondToReviewValidation = exports.createReviewValidation = void 0;
const express_validator_1 = require("express-validator");
exports.createReviewValidation = [
    (0, express_validator_1.body)('bookingId').notEmpty().isMongoId().withMessage('Invalid booking ID'),
    (0, express_validator_1.body)('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
    (0, express_validator_1.body)('title').optional().trim().isLength({ max: 100 }),
    (0, express_validator_1.body)('comment').trim().isLength({ min: 10, max: 1000 }),
    (0, express_validator_1.body)('detailedRatings.serviceQuality').optional().isInt({ min: 1, max: 5 }),
    (0, express_validator_1.body)('detailedRatings.communication').optional().isInt({ min: 1, max: 5 }),
    (0, express_validator_1.body)('detailedRatings.punctuality').optional().isInt({ min: 1, max: 5 }),
    (0, express_validator_1.body)('detailedRatings.professionalism').optional().isInt({ min: 1, max: 5 }),
    (0, express_validator_1.body)('detailedRatings.valueForMoney').optional().isInt({ min: 1, max: 5 }),
    (0, express_validator_1.body)('images').optional().isArray(),
    (0, express_validator_1.body)('images.*').optional().isURL(),
];
exports.respondToReviewValidation = [
    (0, express_validator_1.body)('comment').trim().notEmpty().isLength({ min: 10, max: 500 }),
];
exports.voteHelpfulValidation = [
    (0, express_validator_1.body)('isHelpful').isBoolean().withMessage('isHelpful must be boolean'),
];
exports.flagReviewValidation = [
    (0, express_validator_1.body)('reason').trim().notEmpty().isLength({ min: 10, max: 200 }),
];
exports.hideReviewValidation = [
    (0, express_validator_1.body)('reason').trim().notEmpty().isLength({ min: 10, max: 500 }),
];
exports.reviewIdValidation = [
    (0, express_validator_1.param)('reviewId').isMongoId().withMessage('Invalid review ID'),
];
exports.userIdValidation = [
    (0, express_validator_1.param)('userId').isMongoId().withMessage('Invalid user ID'),
];
exports.serviceIdValidation = [
    (0, express_validator_1.param)('serviceId').isMongoId().withMessage('Invalid service ID'),
];
exports.getReviewsValidation = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)('rating').optional().isInt({ min: 1, max: 5 }),
    (0, express_validator_1.query)('minRating').optional().isInt({ min: 1, max: 5 }),
    (0, express_validator_1.query)('isFlagged').optional().isBoolean(),
    (0, express_validator_1.query)('isApproved').optional().isBoolean(),
];
//# sourceMappingURL=review.validation.js.map