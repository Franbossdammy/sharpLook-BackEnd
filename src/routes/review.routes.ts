import { Router } from 'express';
import reviewController from '../controllers/review.controller';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { validate, validatePagination } from '../middlewares/validate';
import {
  createReviewValidation,
  respondToReviewValidation,
  voteHelpfulValidation,
  flagReviewValidation,
  hideReviewValidation,
  reviewIdValidation,
  userIdValidation,
  serviceIdValidation,
  getReviewsValidation,
} from '../validations/review.validation';

const router = Router();

// User routes
router.post('/', authenticate, validate(createReviewValidation), reviewController.createReview);
router.post('/:reviewId/respond', authenticate, validate([...reviewIdValidation, ...respondToReviewValidation]), reviewController.respondToReview);
router.post('/:reviewId/vote', authenticate, validate([...reviewIdValidation, ...voteHelpfulValidation]), reviewController.voteHelpful);
router.post('/:reviewId/flag', authenticate, validate([...reviewIdValidation, ...flagReviewValidation]), reviewController.flagReview);
router.get('/my-reviews', authenticate, validatePagination, reviewController.getUserReviews);
router.get('/user/:userId', validatePagination, validate([...userIdValidation, ...getReviewsValidation]), reviewController.getReviewsForUser);
router.get('/service/:serviceId', validatePagination, validate([...serviceIdValidation, ...getReviewsValidation]), reviewController.getServiceReviews);
router.get('/user/:userId/stats', validate(userIdValidation), reviewController.getReviewStats);
router.get('/:reviewId', validate(reviewIdValidation), reviewController.getReviewById);

// Admin routes
router.get('/', authenticate, requireAdmin, validatePagination, validate(getReviewsValidation), reviewController.getAllReviews);
router.post('/:reviewId/approve', authenticate, requireAdmin, validate(reviewIdValidation), reviewController.approveReview);
router.post('/:reviewId/hide', authenticate, requireAdmin, validate([...reviewIdValidation, ...hideReviewValidation]), reviewController.hideReview);
router.post('/:reviewId/unhide', authenticate, requireAdmin, validate(reviewIdValidation), reviewController.unhideReview);

export default router;
