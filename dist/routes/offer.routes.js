"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const offer_controller_1 = __importDefault(require("../controllers/offer.controller"));
const upload_1 = require("../middlewares/upload");
const auth_2 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const router = (0, express_1.Router)();
// Client Routes
// ✅ ADD uploadMultipleImages middleware
router.post('/', auth_1.authenticate, (0, upload_1.uploadMultipleImages)(5), offer_controller_1.default.createOffer);
router.get('/my-offers', auth_1.authenticate, offer_controller_1.default.getMyOffers);
router.get('/:offerId', auth_1.authenticate, offer_controller_1.default.getOfferById);
router.post('/:offerId/responses/:responseId/accept', auth_1.authenticate, offer_controller_1.default.acceptResponse);
router.post('/:offerId/responses/:responseId/counter', auth_1.authenticate, offer_controller_1.default.counterOffer);
router.post('/:offerId/close', auth_1.authenticate, offer_controller_1.default.closeOffer);
// Vendor Routes
router.get('/available/list', auth_1.authenticate, offer_controller_1.default.getAvailableOffers);
router.post('/:offerId/respond', auth_1.authenticate, offer_controller_1.default.respondToOffer);
router.get('/responses/my-responses', auth_1.authenticate, offer_controller_1.default.getMyResponses);
router.post('/:offerId/responses/:responseId/accept-counter', auth_1.authenticate, offer_controller_1.default.acceptCounterOffer);
router.post('/:offerId/responses/:responseId/vendor-counter', auth_1.authenticate, offer_controller_1.default.vendorCounterOffer);
// ... existing routes ...
// ==================== ADMIN ROUTES ====================
/**
 * @route   GET /api/v1/offers/admin/all
 * @desc    Get all offers (admin)
 * @access  Private (Admin)
 */
router.get('/admin/all', auth_1.authenticate, auth_2.requireAdmin, validate_1.validatePagination, offer_controller_1.default.getAllOffersAdmin);
/**
 * @route   GET /api/v1/offers/admin/stats
 * @desc    Get offer statistics (admin)
 * @access  Private (Admin)
 */
router.get('/admin/stats', auth_1.authenticate, auth_2.requireAdmin, offer_controller_1.default.getOfferStatsAdmin);
/**
 * @route   DELETE /api/v1/offers/:offerId
 * @desc    Delete offer (admin)
 * @access  Private (Admin)
 */
router.delete('/:offerId', auth_1.authenticate, auth_2.requireAdmin, offer_controller_1.default.deleteOffer);
exports.default = router;
//# sourceMappingURL=offer.routes.js.map