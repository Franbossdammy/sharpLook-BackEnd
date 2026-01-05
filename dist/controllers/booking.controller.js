"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const booking_service_1 = __importDefault(require("../services/booking.service"));
const offer_service_1 = __importDefault(require("../services/offer.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
class BookingController {
    constructor() {
        // ==================== STANDARD BOOKING ENDPOINTS ====================
        /**
         * Create booking with immediate payment (ATOMIC)
         * @route   POST /api/v1/bookings
         * @access  Private (Client)
         * @body    { service, scheduledDate, scheduledTime?, serviceType?, location?, clientNotes?, paymentMethod: 'wallet' | 'card' }
         */
        this.createBooking = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const clientId = req.user.id;
            // Validate payment method is provided
            if (!req.body.paymentMethod) {
                return response_1.default.error(res, 'Payment method is required. Use "wallet" or "card"', 400);
            }
            const result = await booking_service_1.default.createBookingWithPayment(clientId, req.body);
            // ✅ FIX: Check for 'card' instead of 'paystack'
            // If card payment, return authorization URL for redirect
            if (req.body.paymentMethod === 'card' && result.authorizationUrl) {
                return response_1.default.created(res, 'Booking created. Complete payment to confirm.', {
                    booking: result.booking,
                    authorizationUrl: result.authorizationUrl,
                    reference: result.booking.paymentReference, // Include reference for frontend
                    message: 'Redirect user to authorizationUrl to complete payment',
                });
            }
            // If wallet payment, booking is already confirmed
            return response_1.default.created(res, 'Booking created and paid successfully!', {
                booking: result.booking,
                payment: result.payment,
            });
        });
        /**
         * Verify Paystack payment (called after redirect or from webhook)
         * @route   GET /api/v1/bookings/payment/verify/:reference
         * @access  Private (Client)
         */
        this.verifyPaystackPayment = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { reference } = req.params;
            const result = await booking_service_1.default.verifyPaystackPayment(reference);
            return response_1.default.success(res, 'Payment verified. Booking confirmed!', result);
        });
        /**
         * Get booking by ID
         * @route   GET /api/v1/bookings/:bookingId
         * @access  Private (Client/Vendor)
         */
        this.getBookingById = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { bookingId } = req.params;
            const userId = req.user.id;
            const booking = await booking_service_1.default.getBookingById(bookingId, userId);
            return response_1.default.success(res, 'Booking retrieved successfully', { booking });
        });
        /**
         * Get my bookings (as client or vendor)
         * @route   GET /api/v1/bookings
         * @access  Private
         * @query   role=client|vendor, status, startDate, endDate, page, limit
         */
        this.getMyBookings = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const role = req.query.role || 'client';
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                status: req.query.status,
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
            };
            const result = await booking_service_1.default.getUserBookings(userId, role, filters, page, limit);
            return response_1.default.paginated(res, 'Bookings retrieved successfully', result.bookings, page, limit, result.total);
        });
        /**
         * Get booking statistics
         * @route   GET /api/v1/bookings/stats
         * @access  Private
         * @query   role=client|vendor
         */
        this.getBookingStats = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const role = req.query.role || 'client';
            const stats = await booking_service_1.default.getBookingStats(userId, role);
            return response_1.default.success(res, 'Booking statistics retrieved', { stats });
        });
        // ==================== VENDOR BOOKING ACTIONS ====================
        /**
         * Accept booking (Vendor)
         * @route   POST /api/v1/bookings/:bookingId/accept
         * @access  Private (Vendor)
         */
        this.acceptBooking = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { bookingId } = req.params;
            const vendorId = req.user.id;
            const booking = await booking_service_1.default.acceptBooking(bookingId, vendorId);
            return response_1.default.success(res, 'Booking accepted successfully', { booking });
        });
        /**
         * Reject booking (Vendor)
         * @route   POST /api/v1/bookings/:bookingId/reject
         * @access  Private (Vendor)
         * @body    { reason?: string }
         */
        this.rejectBooking = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { bookingId } = req.params;
            const vendorId = req.user.id;
            const { reason } = req.body;
            const booking = await booking_service_1.default.rejectBooking(bookingId, vendorId, reason);
            return response_1.default.success(res, 'Booking rejected. Client has been refunded.', { booking });
        });
        /**
         * Start booking (move to in progress)
         * @route   POST /api/v1/bookings/:bookingId/start
         * @access  Private (Vendor)
         */
        this.startBooking = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { bookingId } = req.params;
            const vendorId = req.user.id;
            const booking = await booking_service_1.default.startBooking(bookingId, vendorId);
            return response_1.default.success(res, 'Booking started', { booking });
        });
        // ==================== COMPLETION & CANCELLATION ====================
        /**
         * Mark booking as complete (Client or Vendor)
         * @route   POST /api/v1/bookings/:bookingId/complete
         * @access  Private
         */
        this.markComplete = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { bookingId } = req.params;
            const userId = req.user.id;
            const role = req.user.isVendor ? 'vendor' : 'client';
            const booking = await booking_service_1.default.markComplete(bookingId, userId, role);
            const message = booking.status === 'completed'
                ? 'Booking completed! Payment released to vendor.'
                : `You marked the booking as complete. Waiting for ${role === 'client' ? 'vendor' : 'client'} confirmation.`;
            return response_1.default.success(res, message, { booking });
        });
        /**
         * Cancel booking (Client or Vendor)
         * Applies cancellation policy:
         * - Client: 20% penalty if < 59 mins before appointment
         * - Vendor: Red flag if < 3h 59m before appointment
         *
         * @route   POST /api/v1/bookings/:bookingId/cancel
         * @access  Private
         * @body    { reason?: string }
         */
        this.cancelBooking = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { bookingId } = req.params;
            const userId = req.user.id;
            const { reason } = req.body;
            const booking = await booking_service_1.default.cancelBooking(bookingId, userId, reason);
            let message = 'Booking cancelled.';
            // Customize message based on refund status
            if (booking.paymentStatus === 'refunded') {
                message = 'Booking cancelled. Full refund processed to your wallet.';
            }
            else if (booking.paymentStatus === 'partially_refunded') {
                message = `Booking cancelled. 80% refunded to your wallet (20% cancellation fee applied for late cancellation).`;
            }
            return response_1.default.success(res, message, { booking });
        });
        /**
         * Update booking notes
         * @route   PATCH /api/v1/bookings/:bookingId
         * @access  Private
         * @body    { clientNotes?, vendorNotes? }
         */
        this.updateBooking = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { bookingId } = req.params;
            const userId = req.user.id;
            const booking = await booking_service_1.default.updateBooking(bookingId, userId, req.body);
            return response_1.default.success(res, 'Booking updated', { booking });
        });
        // ==================== ADMIN ENDPOINTS ====================
        /**
         * Get vendor red flags (Admin)
         * @route   GET /api/v1/admin/bookings/red-flags
         * @access  Private (Admin)
         * @query   vendorId?, severity?, startDate?, endDate?, page, limit
         */
        this.getVendorRedFlags = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = {
                vendorId: req.query.vendorId,
                severity: req.query.severity,
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
            };
            const result = await booking_service_1.default.getVendorRedFlags(filters, page, limit);
            return response_1.default.paginated(res, 'Vendor red flags retrieved', result.vendors, page, limit, result.total);
        });
        // ==================== OFFER-BASED BOOKING ENDPOINTS ====================
        this.createOffer = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const clientId = req.user.id;
            const offer = await offer_service_1.default.createOffer(clientId, req.body);
            return response_1.default.created(res, 'Offer created successfully', { offer });
        });
        this.getAvailableOffers = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const vendorId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                category: req.query.category,
                priceMin: req.query.priceMin ? parseFloat(req.query.priceMin) : undefined,
                priceMax: req.query.priceMax ? parseFloat(req.query.priceMax) : undefined,
            };
            if (req.query.latitude && req.query.longitude) {
                filters.location = {
                    latitude: parseFloat(req.query.latitude),
                    longitude: parseFloat(req.query.longitude),
                    maxDistance: req.query.maxDistance ? parseInt(req.query.maxDistance) : 20,
                };
            }
            const result = await offer_service_1.default.getAvailableOffers(vendorId, filters, page, limit);
            return response_1.default.paginated(res, 'Available offers retrieved', result.offers, page, limit, result.total);
        });
        this.respondToOffer = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { offerId } = req.params;
            const vendorId = req.user.id;
            const offer = await offer_service_1.default.respondToOffer(offerId, vendorId, req.body);
            return response_1.default.success(res, 'Response submitted successfully', { offer });
        });
        this.counterOffer = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { offerId, responseId } = req.params;
            const clientId = req.user.id;
            const { counterPrice } = req.body;
            const offer = await offer_service_1.default.counterOffer(offerId, clientId, responseId, counterPrice);
            return response_1.default.success(res, 'Counter offer submitted', { offer });
        });
        this.acceptResponse = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { offerId, responseId } = req.params;
            const clientId = req.user.id;
            const result = await offer_service_1.default.acceptResponse(offerId, clientId, responseId);
            return response_1.default.success(res, 'Vendor selected and booking created', result);
        });
        this.getOfferById = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { offerId } = req.params;
            const userId = req.user.id;
            const offer = await offer_service_1.default.getOfferById(offerId, userId);
            return response_1.default.success(res, 'Offer retrieved successfully', { offer });
        });
        this.getMyOffers = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const clientId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await offer_service_1.default.getClientOffers(clientId, page, limit);
            return response_1.default.paginated(res, 'Your offers retrieved', result.offers, page, limit, result.total);
        });
        this.getMyResponses = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const vendorId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await offer_service_1.default.getVendorResponses(vendorId, page, limit);
            return response_1.default.paginated(res, 'Your responses retrieved', result.offers, page, limit, result.total);
        });
        this.closeOffer = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { offerId } = req.params;
            const clientId = req.user.id;
            const offer = await offer_service_1.default.closeOffer(offerId, clientId);
            return response_1.default.success(res, 'Offer closed', { offer });
        });
        /**
         * Preview booking price before creation
         * @route   POST /api/v1/bookings/price-preview
         * @access  Private (Client)
         * @body    { serviceId, serviceType, location? }
         */
        this.previewPrice = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { serviceId, serviceType, location } = req.body;
            if (!serviceId) {
                return response_1.default.error(res, 'Service ID is required', 400);
            }
            const preview = await booking_service_1.default.previewBookingPrice({
                serviceId,
                serviceType: serviceType || 'shop',
                location,
            });
            return response_1.default.success(res, 'Price preview calculated', preview);
        });
    }
}
exports.default = new BookingController();
//# sourceMappingURL=booking.controller.js.map