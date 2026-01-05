"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Review_1 = __importDefault(require("../models/Review"));
const Booking_1 = __importDefault(require("../models/Booking"));
const User_1 = __importDefault(require("../models/User"));
const Service_1 = __importDefault(require("../models/Service"));
const errors_1 = require("../utils/errors");
const helpers_1 = require("../utils/helpers");
const types_1 = require("../types");
const logger_1 = __importDefault(require("../utils/logger"));
class ReviewService {
    /**
     * Create review
     */
    async createReview(userId, data) {
        // Get booking
        const booking = await Booking_1.default.findById(data.bookingId);
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        // Verify booking is completed
        if (booking.status !== types_1.BookingStatus.COMPLETED) {
            throw new errors_1.BadRequestError('Can only review completed bookings');
        }
        // Check if already reviewed
        const existingReview = await Review_1.default.findOne({ booking: data.bookingId });
        if (existingReview) {
            throw new errors_1.BadRequestError('You have already reviewed this booking');
        }
        // Determine reviewer type and reviewee
        const isClient = booking.client.toString() === userId;
        const isVendor = booking.vendor.toString() === userId;
        if (!isClient && !isVendor) {
            throw new errors_1.ForbiddenError('You can only review your own bookings');
        }
        const reviewerType = isClient ? 'client' : 'vendor';
        const reviewee = isClient ? booking.vendor : booking.client;
        // Create review
        const review = await Review_1.default.create({
            booking: data.bookingId,
            reviewer: userId,
            reviewee,
            reviewerType,
            rating: data.rating,
            title: data.title,
            comment: data.comment,
            detailedRatings: data.detailedRatings,
            images: data.images || [],
            isApproved: true,
            helpfulCount: 0,
            notHelpfulCount: 0,
            helpfulVotes: [],
        });
        // Update booking
        booking.hasReview = true;
        booking.reviewId = review._id;
        await booking.save();
        // Update reviewee rating
        await this.updateUserRating(reviewee.toString());
        // If reviewing a vendor, update service rating
        if (reviewerType === 'client') {
            await this.updateServiceRating(booking.service.toString());
        }
        logger_1.default.info(`Review created: ${review._id} for booking ${data.bookingId}`);
        return review;
    }
    /**
     * Update user rating
     */
    async updateUserRating(userId) {
        const user = await User_1.default.findById(userId);
        if (!user || !user.isVendor)
            return;
        // Calculate average rating from all reviews
        const reviews = await Review_1.default.find({
            reviewee: userId,
            isApproved: true,
            isHidden: false,
        });
        if (reviews.length === 0)
            return;
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / reviews.length;
        // Update vendor profile
        if (user.vendorProfile) {
            user.vendorProfile.rating = Math.round(averageRating * 10) / 10; // Round to 1 decimal
            user.vendorProfile.totalRatings = reviews.length;
            await user.save();
        }
    }
    /**
     * Update service rating
     */
    async updateServiceRating(serviceId) {
        const service = await Service_1.default.findById(serviceId);
        if (!service)
            return;
        // Get all bookings for this service
        const bookings = await Booking_1.default.find({
            service: serviceId,
            hasReview: true,
        }).select('reviewId');
        const reviewIds = bookings.map((b) => b.reviewId).filter((id) => id);
        // Get reviews
        const reviews = await Review_1.default.find({
            _id: { $in: reviewIds },
            reviewerType: 'client',
            isApproved: true,
            isHidden: false,
        });
        if (reviews.length === 0)
            return;
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / reviews.length;
        if (!service.metadata) {
            service.metadata = {
                views: 0,
                bookings: 0,
                completedBookings: 0,
                averageRating: 0,
                totalReviews: 0,
            };
        }
        service.metadata.averageRating = Math.round(averageRating * 10) / 10;
        service.metadata.totalReviews = reviews.length;
        await service.save();
    }
    /**
     * Add response to review
     */
    async respondToReview(reviewId, userId, comment) {
        const review = await Review_1.default.findById(reviewId);
        if (!review) {
            throw new errors_1.NotFoundError('Review not found');
        }
        // Verify user is the reviewee
        if (review.reviewee.toString() !== userId) {
            throw new errors_1.ForbiddenError('Only the reviewee can respond to this review');
        }
        // Check if already responded
        if (review.response) {
            throw new errors_1.BadRequestError('You have already responded to this review');
        }
        review.response = {
            comment,
            respondedAt: new Date(),
        };
        await review.save();
        return review;
    }
    /**
     * Vote review as helpful
     */
    async voteHelpful(reviewId, userId, isHelpful) {
        const review = await Review_1.default.findById(reviewId);
        if (!review) {
            throw new errors_1.NotFoundError('Review not found');
        }
        // Check if already voted
        const hasVoted = review.helpfulVotes.some((id) => id.toString() === userId);
        if (hasVoted) {
            throw new errors_1.BadRequestError('You have already voted on this review');
        }
        // Add vote
        review.helpfulVotes.push(userId);
        if (isHelpful) {
            review.helpfulCount += 1;
        }
        else {
            review.notHelpfulCount += 1;
        }
        await review.save();
        return review;
    }
    /**
     * Flag review
     */
    async flagReview(reviewId, userId, reason) {
        const review = await Review_1.default.findById(reviewId);
        if (!review) {
            throw new errors_1.NotFoundError('Review not found');
        }
        review.isFlagged = true;
        review.flagReason = reason;
        review.flaggedBy = userId;
        review.flaggedAt = new Date();
        await review.save();
        logger_1.default.info(`Review flagged: ${reviewId} by user ${userId}`);
        return review;
    }
    /**
     * Get review by ID
     */
    async getReviewById(reviewId) {
        const review = await Review_1.default.findById(reviewId)
            .populate('reviewer', 'firstName lastName avatar')
            .populate('reviewee', 'firstName lastName avatar vendorProfile')
            .populate('booking', 'service scheduledDate');
        if (!review) {
            throw new errors_1.NotFoundError('Review not found');
        }
        return review;
    }
    /**
     * Get user reviews (reviews written by user)
     */
    async getUserReviews(userId, page = 1, limit = 10) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const [reviews, total] = await Promise.all([
            Review_1.default.find({ reviewer: userId })
                .populate('reviewee', 'firstName lastName avatar vendorProfile')
                .populate('booking', 'service scheduledDate')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Review_1.default.countDocuments({ reviewer: userId }),
        ]);
        return {
            reviews,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get reviews for user (reviews received by user)
     */
    async getReviewsForUser(userId, filters, page = 1, limit = 10) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const query = {
            reviewee: userId,
            isApproved: true,
            isHidden: false,
        };
        if (filters?.rating) {
            query.rating = filters.rating;
        }
        if (filters?.minRating) {
            query.rating = { $gte: filters.minRating };
        }
        const [reviews, total] = await Promise.all([
            Review_1.default.find(query)
                .populate('reviewer', 'firstName lastName avatar')
                .populate('booking', 'service scheduledDate')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Review_1.default.countDocuments(query),
        ]);
        return {
            reviews,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get service reviews
     */
    async getServiceReviews(serviceId, filters, page = 1, limit = 10) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        // Get bookings for this service
        const bookings = await Booking_1.default.find({
            service: serviceId,
            hasReview: true,
        }).select('reviewId');
        const reviewIds = bookings.map((b) => b.reviewId).filter((id) => id);
        const query = {
            _id: { $in: reviewIds },
            reviewerType: 'client',
            isApproved: true,
            isHidden: false,
        };
        if (filters?.rating) {
            query.rating = filters.rating;
        }
        if (filters?.minRating) {
            query.rating = { $gte: filters.minRating };
        }
        const [reviews, total] = await Promise.all([
            Review_1.default.find(query)
                .populate('reviewer', 'firstName lastName avatar')
                .populate('booking', 'scheduledDate')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Review_1.default.countDocuments(query),
        ]);
        return {
            reviews,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    // ==================== ADMIN METHODS ====================
    /**
     * Get all reviews (Admin)
     */
    async getAllReviews(filters, page = 1, limit = 20) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const query = {};
        if (filters?.isFlagged !== undefined) {
            query.isFlagged = filters.isFlagged;
        }
        if (filters?.isApproved !== undefined) {
            query.isApproved = filters.isApproved;
        }
        if (filters?.rating) {
            query.rating = filters.rating;
        }
        const [reviews, total] = await Promise.all([
            Review_1.default.find(query)
                .populate('reviewer', 'firstName lastName email avatar')
                .populate('reviewee', 'firstName lastName email avatar')
                .populate('booking', 'service scheduledDate totalAmount')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Review_1.default.countDocuments(query),
        ]);
        return {
            reviews,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Approve review (Admin)
     */
    async approveReview(reviewId, adminId) {
        const review = await Review_1.default.findById(reviewId);
        if (!review) {
            throw new errors_1.NotFoundError('Review not found');
        }
        review.isApproved = true;
        review.moderatedBy = adminId;
        review.moderatedAt = new Date();
        await review.save();
        // Update ratings
        await this.updateUserRating(review.reviewee.toString());
        const booking = await Booking_1.default.findById(review.booking);
        if (booking && review.reviewerType === 'client') {
            await this.updateServiceRating(booking.service.toString());
        }
        return review;
    }
    /**
     * Hide review (Admin)
     */
    async hideReview(reviewId, adminId, reason) {
        const review = await Review_1.default.findById(reviewId);
        if (!review) {
            throw new errors_1.NotFoundError('Review not found');
        }
        review.isHidden = true;
        review.hiddenReason = reason;
        review.moderatedBy = adminId;
        review.moderatedAt = new Date();
        await review.save();
        // Recalculate ratings
        await this.updateUserRating(review.reviewee.toString());
        const booking = await Booking_1.default.findById(review.booking);
        if (booking && review.reviewerType === 'client') {
            await this.updateServiceRating(booking.service.toString());
        }
        return review;
    }
    /**
     * Unhide review (Admin)
     */
    async unhideReview(reviewId, adminId) {
        const review = await Review_1.default.findById(reviewId);
        if (!review) {
            throw new errors_1.NotFoundError('Review not found');
        }
        review.isHidden = false;
        review.hiddenReason = undefined;
        review.moderatedBy = adminId;
        review.moderatedAt = new Date();
        await review.save();
        // Recalculate ratings
        await this.updateUserRating(review.reviewee.toString());
        const booking = await Booking_1.default.findById(review.booking);
        if (booking && review.reviewerType === 'client') {
            await this.updateServiceRating(booking.service.toString());
        }
        return review;
    }
    /**
     * Get review statistics
     */
    async getReviewStats(userId) {
        const query = userId ? { reviewee: userId } : {};
        const [total, byRating, flagged, approved] = await Promise.all([
            Review_1.default.countDocuments(query),
            Review_1.default.aggregate([
                { $match: query },
                { $group: { _id: '$rating', count: { $sum: 1 } } },
                { $sort: { _id: -1 } },
            ]),
            Review_1.default.countDocuments({ ...query, isFlagged: true }),
            Review_1.default.countDocuments({ ...query, isApproved: true }),
        ]);
        const avgRatingResult = await Review_1.default.aggregate([
            { $match: { ...query, isApproved: true, isHidden: false } },
            { $group: { _id: null, avgRating: { $avg: '$rating' } } },
        ]);
        return {
            total,
            byRating,
            flagged,
            approved,
            averageRating: avgRatingResult[0]?.avgRating || 0,
        };
    }
}
exports.default = new ReviewService();
//# sourceMappingURL=review.service.js.map