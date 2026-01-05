import { IReview } from '../models/Review';
declare class ReviewService {
    /**
     * Create review
     */
    createReview(userId: string, data: {
        bookingId: string;
        rating: number;
        title?: string;
        comment: string;
        detailedRatings?: any;
        images?: string[];
    }): Promise<IReview>;
    /**
     * Update user rating
     */
    private updateUserRating;
    /**
     * Update service rating
     */
    private updateServiceRating;
    /**
     * Add response to review
     */
    respondToReview(reviewId: string, userId: string, comment: string): Promise<IReview>;
    /**
     * Vote review as helpful
     */
    voteHelpful(reviewId: string, userId: string, isHelpful: boolean): Promise<IReview>;
    /**
     * Flag review
     */
    flagReview(reviewId: string, userId: string, reason: string): Promise<IReview>;
    /**
     * Get review by ID
     */
    getReviewById(reviewId: string): Promise<IReview>;
    /**
     * Get user reviews (reviews written by user)
     */
    getUserReviews(userId: string, page?: number, limit?: number): Promise<{
        reviews: IReview[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get reviews for user (reviews received by user)
     */
    getReviewsForUser(userId: string, filters?: {
        rating?: number;
        minRating?: number;
    }, page?: number, limit?: number): Promise<{
        reviews: IReview[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get service reviews
     */
    getServiceReviews(serviceId: string, filters?: {
        rating?: number;
        minRating?: number;
    }, page?: number, limit?: number): Promise<{
        reviews: IReview[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get all reviews (Admin)
     */
    getAllReviews(filters?: {
        isFlagged?: boolean;
        isApproved?: boolean;
        rating?: number;
    }, page?: number, limit?: number): Promise<{
        reviews: IReview[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Approve review (Admin)
     */
    approveReview(reviewId: string, adminId: string): Promise<IReview>;
    /**
     * Hide review (Admin)
     */
    hideReview(reviewId: string, adminId: string, reason: string): Promise<IReview>;
    /**
     * Unhide review (Admin)
     */
    unhideReview(reviewId: string, adminId: string): Promise<IReview>;
    /**
     * Get review statistics
     */
    getReviewStats(userId?: string): Promise<any>;
}
declare const _default: ReviewService;
export default _default;
//# sourceMappingURL=review.service.d.ts.map