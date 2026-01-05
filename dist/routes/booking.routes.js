"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const booking_controller_1 = __importDefault(require("../controllers/booking.controller"));
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const booking_validation_1 = require("../validations/booking.validation");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
router.post('/price-preview', auth_1.authenticate, booking_controller_1.default.previewPrice);
// ==================== STANDARD BOOKING ROUTES ====================
/**
 * @route   POST /api/v1/bookings
 * @desc    Create a booking WITH immediate payment (ATOMIC)
 * @access  Private (Client)
 *
 * @body    {
 *   service: string (required),
 *   scheduledDate: Date (required),
 *   scheduledTime?: string,
 *   serviceType?: 'home' | 'shop',
 *   location?: { address, city, state, coordinates },
 *   clientNotes?: string,
 *   paymentMethod: 'wallet' | 'paystack' (required)
 * }
 *
 * @note    Booking cannot be created without payment.
 *          - Wallet: Deducts immediately, booking confirmed
 *          - Paystack: Returns authorizationUrl, booking pending until payment confirmed
 */
router.post('/', auth_1.authenticate, (0, validate_1.validate)(booking_validation_1.createBookingValidation), booking_controller_1.default.createBooking);
/**
 * @route   GET /api/v1/bookings/payment/verify/:reference
 * @desc    Verify Paystack payment after redirect (activates booking)
 * @access  Private (Client)
 */
router.get('/payment/verify/:reference', auth_1.authenticate, (0, validate_1.validate)([
    (0, express_validator_1.param)('reference')
        .notEmpty()
        .withMessage('Payment reference is required')
        .isString()
        .withMessage('Reference must be a string'),
]), booking_controller_1.default.verifyPaystackPayment);
/**
 * @route   GET /api/v1/bookings/my-bookings
 * @desc    Get user bookings (client or vendor)
 * @access  Private
 */
router.get('/my-bookings', auth_1.authenticate, validate_1.validatePagination, (0, validate_1.validate)(booking_validation_1.getBookingsValidation), booking_controller_1.default.getMyBookings);
/**
 * @route   GET /api/v1/bookings/stats
 * @desc    Get booking statistics
 * @access  Private
 */
router.get('/stats', auth_1.authenticate, booking_controller_1.default.getBookingStats);
/**
 * @route   GET /api/v1/bookings/:bookingId
 * @desc    Get booking by ID
 * @access  Private (Client or Vendor)
 */
router.get('/:bookingId', auth_1.authenticate, (0, validate_1.validate)(booking_validation_1.bookingIdValidation), booking_controller_1.default.getBookingById);
/**
 * @route   PUT /api/v1/bookings/:bookingId
 * @desc    Update booking notes
 * @access  Private (Client or Vendor)
 */
router.put('/:bookingId', auth_1.authenticate, (0, validate_1.validate)([...booking_validation_1.bookingIdValidation, ...booking_validation_1.updateBookingValidation]), booking_controller_1.default.updateBooking);
/**
 * @route   POST /api/v1/bookings/:bookingId/accept
 * @desc    Accept booking (Vendor)
 * @access  Private (Vendor)
 */
router.post('/:bookingId/accept', auth_1.authenticate, auth_1.requireVendor, (0, validate_1.validate)(booking_validation_1.bookingIdValidation), booking_controller_1.default.acceptBooking);
/**
 * @route   POST /api/v1/bookings/:bookingId/reject
 * @desc    Reject booking (Vendor) - triggers full refund to client
 * @access  Private (Vendor)
 *
 * @note    If rejected < 3h 59m before appointment, creates RED FLAG for admin
 */
router.post('/:bookingId/reject', auth_1.authenticate, auth_1.requireVendor, (0, validate_1.validate)([...booking_validation_1.bookingIdValidation, ...booking_validation_1.reasonValidation]), booking_controller_1.default.rejectBooking);
/**
 * @route   POST /api/v1/bookings/:bookingId/start
 * @desc    Start booking (Vendor)
 * @access  Private (Vendor)
 */
router.post('/:bookingId/start', auth_1.authenticate, auth_1.requireVendor, (0, validate_1.validate)(booking_validation_1.bookingIdValidation), booking_controller_1.default.startBooking);
/**
 * @route   POST /api/v1/bookings/:bookingId/complete
 * @desc    Mark booking as complete
 * @access  Private (Client or Vendor)
 */
router.post('/:bookingId/complete', auth_1.authenticate, (0, validate_1.validate)(booking_validation_1.bookingIdValidation), booking_controller_1.default.markComplete);
/**
 * @route   POST /api/v1/bookings/:bookingId/cancel
 * @desc    Cancel booking (with cancellation policy)
 * @access  Private (Client or Vendor)
 *
 * @note    CANCELLATION POLICY:
 *          - Client cancels >= 59 mins before → Full refund
 *          - Client cancels < 59 mins before → 20% penalty (vendor gets share)
 *          - Vendor cancels < 3h 59m before → RED FLAG created for admin
 */
router.post('/:bookingId/cancel', auth_1.authenticate, (0, validate_1.validate)([...booking_validation_1.bookingIdValidation, ...booking_validation_1.reasonValidation]), booking_controller_1.default.cancelBooking);
// ==================== OFFER-BASED BOOKING ROUTES ====================
/**
 * @route   POST /api/v1/bookings/offers
 * @desc    Create offer request
 * @access  Private (Client)
 */
router.post('/offers', auth_1.authenticate, (0, validate_1.validate)(booking_validation_1.createOfferValidation), booking_controller_1.default.createOffer);
/**
 * @route   GET /api/v1/bookings/offers/available
 * @desc    Get available offers (for vendors)
 * @access  Private (Vendor)
 */
router.get('/offers/available', auth_1.authenticate, auth_1.requireVendor, validate_1.validatePagination, (0, validate_1.validate)(booking_validation_1.getOffersValidation), booking_controller_1.default.getAvailableOffers);
/**
 * @route   GET /api/v1/bookings/offers/my-offers
 * @desc    Get client's offers
 * @access  Private (Client)
 */
router.get('/offers/my-offers', auth_1.authenticate, validate_1.validatePagination, booking_controller_1.default.getMyOffers);
/**
 * @route   GET /api/v1/bookings/offers/my-responses
 * @desc    Get vendor's responses to offers
 * @access  Private (Vendor)
 */
router.get('/offers/my-responses', auth_1.authenticate, auth_1.requireVendor, validate_1.validatePagination, booking_controller_1.default.getMyResponses);
/**
 * @route   GET /api/v1/bookings/offers/:offerId
 * @desc    Get offer by ID
 * @access  Private (Client or responding Vendor)
 */
router.get('/offers/:offerId', auth_1.authenticate, (0, validate_1.validate)(booking_validation_1.offerIdValidation), booking_controller_1.default.getOfferById);
/**
 * @route   POST /api/v1/bookings/offers/:offerId/respond
 * @desc    Vendor responds to offer
 * @access  Private (Vendor)
 */
router.post('/offers/:offerId/respond', auth_1.authenticate, auth_1.requireVendor, (0, validate_1.validate)([...booking_validation_1.offerIdValidation, ...booking_validation_1.respondToOfferValidation]), booking_controller_1.default.respondToOffer);
/**
 * @route   POST /api/v1/bookings/offers/:offerId/responses/:responseId/counter
 * @desc    Client submits counter offer
 * @access  Private (Client)
 */
router.post('/offers/:offerId/responses/:responseId/counter', auth_1.authenticate, (0, validate_1.validate)([...booking_validation_1.offerIdValidation, ...booking_validation_1.responseIdValidation, ...booking_validation_1.counterOfferValidation]), booking_controller_1.default.counterOffer);
/**
 * @route   POST /api/v1/bookings/offers/:offerId/responses/:responseId/accept
 * @desc    Client accepts vendor response
 * @access  Private (Client)
 */
router.post('/offers/:offerId/responses/:responseId/accept', auth_1.authenticate, (0, validate_1.validate)([...booking_validation_1.offerIdValidation, ...booking_validation_1.responseIdValidation]), booking_controller_1.default.acceptResponse);
/**
 * @route   POST /api/v1/bookings/offers/:offerId/close
 * @desc    Close offer
 * @access  Private (Client)
 */
router.post('/offers/:offerId/close', auth_1.authenticate, (0, validate_1.validate)(booking_validation_1.offerIdValidation), booking_controller_1.default.closeOffer);
// ==================== REMOVED ROUTES ====================
// The following routes are NO LONGER NEEDED because payment is now atomic with booking creation:
//
// - POST /wallet/pay → Removed (use paymentMethod: 'wallet' in POST /)
// - GET /:bookingId/wallet/check → Removed (check balance before creating booking)
// - POST /:bookingId/payment/paystack/initialize → Removed (use paymentMethod: 'paystack' in POST /)
//
// The new flow is:
// 1. Client calls POST /api/v1/bookings with paymentMethod
// 2. If wallet: booking created + paid immediately
// 3. If paystack: booking created (pending) + authorizationUrl returned
// 4. After Paystack payment: GET /api/v1/bookings/payment/verify/:reference
exports.default = router;
//# sourceMappingURL=booking.routes.js.map