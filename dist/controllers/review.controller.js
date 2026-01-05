"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const review_service_1 = __importDefault(require("../services/review.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
class ReviewController {
    constructor() {
        this.createReview = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const review = await review_service_1.default.createReview(userId, req.body);
            return response_1.default.created(res, 'Review created successfully', { review });
        });
        this.respondToReview = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { reviewId } = req.params;
            const userId = req.user.id;
            const { comment } = req.body;
            const review = await review_service_1.default.respondToReview(reviewId, userId, comment);
            return response_1.default.success(res, 'Response added successfully', { review });
        });
        this.voteHelpful = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { reviewId } = req.params;
            const userId = req.user.id;
            const { isHelpful } = req.body;
            const review = await review_service_1.default.voteHelpful(reviewId, userId, isHelpful);
            return response_1.default.success(res, 'Vote recorded successfully', { review });
        });
        this.flagReview = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { reviewId } = req.params;
            const userId = req.user.id;
            const { reason } = req.body;
            const review = await review_service_1.default.flagReview(reviewId, userId, reason);
            return response_1.default.success(res, 'Review flagged successfully', { review });
        });
        this.getReviewById = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { reviewId } = req.params;
            const review = await review_service_1.default.getReviewById(reviewId);
            return response_1.default.success(res, 'Review retrieved successfully', { review });
        });
        this.getUserReviews = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await review_service_1.default.getUserReviews(userId, page, limit);
            return response_1.default.paginated(res, 'Reviews retrieved', result.reviews, page, limit, result.total);
        });
        this.getReviewsForUser = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { userId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                rating: req.query.rating ? parseInt(req.query.rating) : undefined,
                minRating: req.query.minRating ? parseInt(req.query.minRating) : undefined,
            };
            const result = await review_service_1.default.getReviewsForUser(userId, filters, page, limit);
            return response_1.default.paginated(res, 'Reviews retrieved', result.reviews, page, limit, result.total);
        });
        this.getServiceReviews = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { serviceId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                rating: req.query.rating ? parseInt(req.query.rating) : undefined,
                minRating: req.query.minRating ? parseInt(req.query.minRating) : undefined,
            };
            const result = await review_service_1.default.getServiceReviews(serviceId, filters, page, limit);
            return response_1.default.paginated(res, 'Reviews retrieved', result.reviews, page, limit, result.total);
        });
        this.getReviewStats = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { userId } = req.params;
            const stats = await review_service_1.default.getReviewStats(userId);
            return response_1.default.success(res, 'Statistics retrieved', { stats });
        });
        // Admin endpoints
        this.getAllReviews = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = {
                isFlagged: req.query.isFlagged === 'true',
                isApproved: req.query.isApproved === 'true',
                rating: req.query.rating ? parseInt(req.query.rating) : undefined,
            };
            const result = await review_service_1.default.getAllReviews(filters, page, limit);
            return response_1.default.paginated(res, 'Reviews retrieved', result.reviews, page, limit, result.total);
        });
        this.approveReview = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { reviewId } = req.params;
            const adminId = req.user.id;
            const review = await review_service_1.default.approveReview(reviewId, adminId);
            return response_1.default.success(res, 'Review approved', { review });
        });
        this.hideReview = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { reviewId } = req.params;
            const adminId = req.user.id;
            const { reason } = req.body;
            const review = await review_service_1.default.hideReview(reviewId, adminId, reason);
            return response_1.default.success(res, 'Review hidden', { review });
        });
        this.unhideReview = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { reviewId } = req.params;
            const adminId = req.user.id;
            const review = await review_service_1.default.unhideReview(reviewId, adminId);
            return response_1.default.success(res, 'Review unhidden', { review });
        });
    }
}
exports.default = new ReviewController();
//# sourceMappingURL=review.controller.js.map