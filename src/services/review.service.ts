import Review, { IReview } from '../models/Review';
import Booking from '../models/Booking';
import User from '../models/User';
import Service from '../models/Service';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { parsePaginationParams } from '../utils/helpers';
import { BookingStatus } from '../types';
import logger from '../utils/logger';

class ReviewService {
  /**
   * Create review
   */
  public async createReview(
    userId: string,
    data: {
      bookingId: string;
      rating: number;
      title?: string;
      comment: string;
      detailedRatings?: any;
      images?: string[];
    }
  ): Promise<IReview> {
    // Get booking
    const booking = await Booking.findById(data.bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Verify booking is completed
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestError('Can only review completed bookings');
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({ booking: data.bookingId });
    if (existingReview) {
      throw new BadRequestError('You have already reviewed this booking');
    }

    // Determine reviewer type and reviewee
    const isClient = booking.client.toString() === userId;
    const isVendor = booking.vendor.toString() === userId;

    if (!isClient && !isVendor) {
      throw new ForbiddenError('You can only review your own bookings');
    }

    const reviewerType = isClient ? 'client' : 'vendor';
    const reviewee = isClient ? booking.vendor : booking.client;

    // Create review
    const review = await Review.create({
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

    logger.info(`Review created: ${review._id} for booking ${data.bookingId}`);

    return review;
  }

  /**
   * Update user rating
   */
  private async updateUserRating(userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user || !user.isVendor) return;

    // Calculate average rating from all reviews
    const reviews = await Review.find({
      reviewee: userId,
      isApproved: true,
      isHidden: false,
    });

    if (reviews.length === 0) return;

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
  private async updateServiceRating(serviceId: string): Promise<void> {
    const service = await Service.findById(serviceId);
    if (!service) return;

    // Get all bookings for this service
    const bookings = await Booking.find({
      service: serviceId,
      hasReview: true,
    }).select('reviewId');

    const reviewIds = bookings.map((b) => b.reviewId).filter((id) => id);

    // Get reviews
    const reviews = await Review.find({
      _id: { $in: reviewIds },
      reviewerType: 'client',
      isApproved: true,
      isHidden: false,
    });

    if (reviews.length === 0) return;

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
  public async respondToReview(
    reviewId: string,
    userId: string,
    comment: string
  ): Promise<IReview> {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new NotFoundError('Review not found');
    }

    // Verify user is the reviewee
    if (review.reviewee.toString() !== userId) {
      throw new ForbiddenError('Only the reviewee can respond to this review');
    }

    // Check if already responded
    if (review.response) {
      throw new BadRequestError('You have already responded to this review');
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
  public async voteHelpful(
    reviewId: string,
    userId: string,
    isHelpful: boolean
  ): Promise<IReview> {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new NotFoundError('Review not found');
    }

    // Check if already voted
    const hasVoted = review.helpfulVotes.some((id) => id.toString() === userId);

    if (hasVoted) {
      throw new BadRequestError('You have already voted on this review');
    }

    // Add vote
    review.helpfulVotes.push(userId as any);

    if (isHelpful) {
      review.helpfulCount += 1;
    } else {
      review.notHelpfulCount += 1;
    }

    await review.save();

    return review;
  }

  /**
   * Flag review
   */
  public async flagReview(
    reviewId: string,
    userId: string,
    reason: string
  ): Promise<IReview> {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new NotFoundError('Review not found');
    }

    review.isFlagged = true;
    review.flagReason = reason;
    review.flaggedBy = userId as any;
    review.flaggedAt = new Date();

    await review.save();

    logger.info(`Review flagged: ${reviewId} by user ${userId}`);

    return review;
  }

  /**
   * Get review by ID
   */
  public async getReviewById(reviewId: string): Promise<IReview> {
    const review = await Review.findById(reviewId)
      .populate('reviewer', 'firstName lastName avatar')
      .populate('reviewee', 'firstName lastName avatar vendorProfile')
      .populate('booking', 'service scheduledDate');

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    return review;
  }

  /**
   * Get user reviews (reviews written by user)
   */
  public async getUserReviews(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ reviews: IReview[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    const [reviews, total] = await Promise.all([
      Review.find({ reviewer: userId })
        .populate('reviewee', 'firstName lastName avatar vendorProfile')
        .populate('booking', 'service scheduledDate')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Review.countDocuments({ reviewer: userId }),
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
  public async getReviewsForUser(
    userId: string,
    filters?: {
      rating?: number;
      minRating?: number;
    },
    page: number = 1,
    limit: number = 10
  ): Promise<{ reviews: IReview[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    const query: any = {
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
      Review.find(query)
        .populate('reviewer', 'firstName lastName avatar')
        .populate('booking', 'service scheduledDate')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Review.countDocuments(query),
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
  public async getServiceReviews(
    serviceId: string,
    filters?: {
      rating?: number;
      minRating?: number;
    },
    page: number = 1,
    limit: number = 10
  ): Promise<{ reviews: IReview[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    // Get bookings for this service
    const bookings = await Booking.find({
      service: serviceId,
      hasReview: true,
    }).select('reviewId');

    const reviewIds = bookings.map((b) => b.reviewId).filter((id) => id);

    const query: any = {
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
      Review.find(query)
        .populate('reviewer', 'firstName lastName avatar')
        .populate('booking', 'scheduledDate')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Review.countDocuments(query),
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
  public async getAllReviews(
    filters?: {
      isFlagged?: boolean;
      isApproved?: boolean;
      rating?: number;
    },
    page: number = 1,
    limit: number = 20
  ): Promise<{ reviews: IReview[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    const query: any = {};

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
      Review.find(query)
        .populate('reviewer', 'firstName lastName email avatar')
        .populate('reviewee', 'firstName lastName email avatar')
        .populate('booking', 'service scheduledDate totalAmount')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Review.countDocuments(query),
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
  public async approveReview(reviewId: string, adminId: string): Promise<IReview> {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new NotFoundError('Review not found');
    }

    review.isApproved = true;
    review.moderatedBy = adminId as any;
    review.moderatedAt = new Date();

    await review.save();

    // Update ratings
    await this.updateUserRating(review.reviewee.toString());
    
    const booking = await Booking.findById(review.booking);
    if (booking && review.reviewerType === 'client') {
      await this.updateServiceRating(booking.service.toString());
    }

    return review;
  }

  /**
   * Hide review (Admin)
   */
  public async hideReview(
    reviewId: string,
    adminId: string,
    reason: string
  ): Promise<IReview> {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new NotFoundError('Review not found');
    }

    review.isHidden = true;
    review.hiddenReason = reason;
    review.moderatedBy = adminId as any;
    review.moderatedAt = new Date();

    await review.save();

    // Recalculate ratings
    await this.updateUserRating(review.reviewee.toString());
    
    const booking = await Booking.findById(review.booking);
    if (booking && review.reviewerType === 'client') {
      await this.updateServiceRating(booking.service.toString());
    }

    return review;
  }

  /**
   * Unhide review (Admin)
   */
  public async unhideReview(reviewId: string, adminId: string): Promise<IReview> {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new NotFoundError('Review not found');
    }

    review.isHidden = false;
    review.hiddenReason = undefined;
    review.moderatedBy = adminId as any;
    review.moderatedAt = new Date();

    await review.save();

    // Recalculate ratings
    await this.updateUserRating(review.reviewee.toString());
    
    const booking = await Booking.findById(review.booking);
    if (booking && review.reviewerType === 'client') {
      await this.updateServiceRating(booking.service.toString());
    }

    return review;
  }

  /**
   * Get review statistics
   */
  public async getReviewStats(userId?: string): Promise<any> {
    const query = userId ? { reviewee: userId } : {};

    const [total, byRating, flagged, approved] = await Promise.all([
      Review.countDocuments(query),
      Review.aggregate([
        { $match: query },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
      ]),
      Review.countDocuments({ ...query, isFlagged: true }),
      Review.countDocuments({ ...query, isApproved: true }),
    ]);

    const avgRatingResult = await Review.aggregate([
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

export default new ReviewService();
