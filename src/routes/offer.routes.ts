import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import offerController from '../controllers/offer.controller';
import { uploadMultipleImages } from '../middlewares/upload'; 
import { requireAdmin } from '../middlewares/auth';
import { validatePagination } from '../middlewares/validate';


const router = Router();

// Client Routes
// ✅ ADD uploadMultipleImages middleware
router.post('/', authenticate, uploadMultipleImages(5), offerController.createOffer);

router.get('/my-offers', authenticate, offerController.getMyOffers);
router.get('/:offerId', authenticate, offerController.getOfferById);
router.post('/:offerId/responses/:responseId/accept', authenticate, offerController.acceptResponse);
router.post('/:offerId/responses/:responseId/counter', authenticate, offerController.counterOffer);
router.post('/:offerId/close', authenticate, offerController.closeOffer);

// Vendor Routes
router.get('/available/list', authenticate, offerController.getAvailableOffers);
router.post('/:offerId/respond', authenticate, offerController.respondToOffer);
router.get('/responses/my-responses', authenticate, offerController.getMyResponses);
router.post('/:offerId/responses/:responseId/accept-counter', authenticate, offerController.acceptCounterOffer);
router.post('/:offerId/responses/:responseId/vendor-counter', authenticate, offerController.vendorCounterOffer);



// ... existing routes ...

// ==================== ADMIN ROUTES ====================

/**
 * @route   GET /api/v1/offers/admin/all
 * @desc    Get all offers (admin)
 * @access  Private (Admin)
 */
router.get(
  '/admin/all',
  authenticate,
  requireAdmin,
  validatePagination,
  offerController.getAllOffersAdmin
);

/**
 * @route   GET /api/v1/offers/admin/stats
 * @desc    Get offer statistics (admin)
 * @access  Private (Admin)
 */
router.get(
  '/admin/stats',
  authenticate,
  requireAdmin,
  offerController.getOfferStatsAdmin
);

/**
 * @route   DELETE /api/v1/offers/:offerId
 * @desc    Delete offer (admin)
 * @access  Private (Admin)
 */
router.delete(
  '/:offerId',
  authenticate,
  requireAdmin,
  offerController.deleteOffer
);

export default router;