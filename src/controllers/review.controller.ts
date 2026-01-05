import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import reviewService from '../services/review.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';

class ReviewController {
  public createReview = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const review = await reviewService.createReview(userId, req.body);
      return ResponseHandler.created(res, 'Review created successfully', { review });
    }
  );

  public respondToReview = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { reviewId } = req.params;
      const userId = req.user!.id;
      const { comment } = req.body;
      const review = await reviewService.respondToReview(reviewId, userId, comment);
      return ResponseHandler.success(res, 'Response added successfully', { review });
    }
  );

  public voteHelpful = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { reviewId } = req.params;
      const userId = req.user!.id;
      const { isHelpful } = req.body;
      const review = await reviewService.voteHelpful(reviewId, userId, isHelpful);
      return ResponseHandler.success(res, 'Vote recorded successfully', { review });
    }
  );

  public flagReview = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { reviewId } = req.params;
      const userId = req.user!.id;
      const { reason } = req.body;
      const review = await reviewService.flagReview(reviewId, userId, reason);
      return ResponseHandler.success(res, 'Review flagged successfully', { review });
    }
  );

  public getReviewById = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { reviewId } = req.params;
      const review = await reviewService.getReviewById(reviewId);
      return ResponseHandler.success(res, 'Review retrieved successfully', { review });
    }
  );

  public getUserReviews = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await reviewService.getUserReviews(userId, page, limit);
      return ResponseHandler.paginated(res, 'Reviews retrieved', result.reviews, page, limit, result.total);
    }
  );

  public getReviewsForUser = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const filters = {
        rating: req.query.rating ? parseInt(req.query.rating as string) : undefined,
        minRating: req.query.minRating ? parseInt(req.query.minRating as string) : undefined,
      };
      const result = await reviewService.getReviewsForUser(userId, filters, page, limit);
      return ResponseHandler.paginated(res, 'Reviews retrieved', result.reviews, page, limit, result.total);
    }
  );

  public getServiceReviews = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { serviceId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const filters = {
        rating: req.query.rating ? parseInt(req.query.rating as string) : undefined,
        minRating: req.query.minRating ? parseInt(req.query.minRating as string) : undefined,
      };
      const result = await reviewService.getServiceReviews(serviceId, filters, page, limit);
      return ResponseHandler.paginated(res, 'Reviews retrieved', result.reviews, page, limit, result.total);
    }
  );

  public getReviewStats = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { userId } = req.params;
      const stats = await reviewService.getReviewStats(userId);
      return ResponseHandler.success(res, 'Statistics retrieved', { stats });
    }
  );

  // Admin endpoints
  public getAllReviews = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters = {
        isFlagged: req.query.isFlagged === 'true',
        isApproved: req.query.isApproved === 'true',
        rating: req.query.rating ? parseInt(req.query.rating as string) : undefined,
      };
      const result = await reviewService.getAllReviews(filters, page, limit);
      return ResponseHandler.paginated(res, 'Reviews retrieved', result.reviews, page, limit, result.total);
    }
  );

  public approveReview = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { reviewId } = req.params;
      const adminId = req.user!.id;
      const review = await reviewService.approveReview(reviewId, adminId);
      return ResponseHandler.success(res, 'Review approved', { review });
    }
  );

  public hideReview = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { reviewId } = req.params;
      const adminId = req.user!.id;
      const { reason } = req.body;
      const review = await reviewService.hideReview(reviewId, adminId, reason);
      return ResponseHandler.success(res, 'Review hidden', { review });
    }
  );

  public unhideReview = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { reviewId } = req.params;
      const adminId = req.user!.id;
      const review = await reviewService.unhideReview(reviewId, adminId);
      return ResponseHandler.success(res, 'Review unhidden', { review });
    }
  );
}

export default new ReviewController();
