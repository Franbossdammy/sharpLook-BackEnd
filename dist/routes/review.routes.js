"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const review_controller_1 = __importDefault(require("../controllers/review.controller"));
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const review_validation_1 = require("../validations/review.validation");
const router = (0, express_1.Router)();
// User routes
router.post('/', auth_1.authenticate, (0, validate_1.validate)(review_validation_1.createReviewValidation), review_controller_1.default.createReview);
router.post('/:reviewId/respond', auth_1.authenticate, (0, validate_1.validate)([...review_validation_1.reviewIdValidation, ...review_validation_1.respondToReviewValidation]), review_controller_1.default.respondToReview);
router.post('/:reviewId/vote', auth_1.authenticate, (0, validate_1.validate)([...review_validation_1.reviewIdValidation, ...review_validation_1.voteHelpfulValidation]), review_controller_1.default.voteHelpful);
router.post('/:reviewId/flag', auth_1.authenticate, (0, validate_1.validate)([...review_validation_1.reviewIdValidation, ...review_validation_1.flagReviewValidation]), review_controller_1.default.flagReview);
router.get('/my-reviews', auth_1.authenticate, validate_1.validatePagination, review_controller_1.default.getUserReviews);
router.get('/user/:userId', validate_1.validatePagination, (0, validate_1.validate)([...review_validation_1.userIdValidation, ...review_validation_1.getReviewsValidation]), review_controller_1.default.getReviewsForUser);
router.get('/service/:serviceId', validate_1.validatePagination, (0, validate_1.validate)([...review_validation_1.serviceIdValidation, ...review_validation_1.getReviewsValidation]), review_controller_1.default.getServiceReviews);
router.get('/user/:userId/stats', (0, validate_1.validate)(review_validation_1.userIdValidation), review_controller_1.default.getReviewStats);
router.get('/:reviewId', (0, validate_1.validate)(review_validation_1.reviewIdValidation), review_controller_1.default.getReviewById);
// Admin routes
router.get('/', auth_1.authenticate, auth_1.requireAdmin, validate_1.validatePagination, (0, validate_1.validate)(review_validation_1.getReviewsValidation), review_controller_1.default.getAllReviews);
router.post('/:reviewId/approve', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)(review_validation_1.reviewIdValidation), review_controller_1.default.approveReview);
router.post('/:reviewId/hide', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)([...review_validation_1.reviewIdValidation, ...review_validation_1.hideReviewValidation]), review_controller_1.default.hideReview);
router.post('/:reviewId/unhide', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)(review_validation_1.reviewIdValidation), review_controller_1.default.unhideReview);
exports.default = router;
//# sourceMappingURL=review.routes.js.map