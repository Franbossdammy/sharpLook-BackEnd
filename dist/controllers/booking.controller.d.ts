import { Response, NextFunction } from 'express';
declare class BookingController {
    /**
     * Create booking with immediate payment (ATOMIC)
     * @route   POST /api/v1/bookings
     * @access  Private (Client)
     * @body    { service, scheduledDate, scheduledTime?, serviceType?, location?, clientNotes?, paymentMethod: 'wallet' | 'card' }
     */
    createBooking: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Verify Paystack payment (called after redirect or from webhook)
     * @route   GET /api/v1/bookings/payment/verify/:reference
     * @access  Private (Client)
     */
    verifyPaystackPayment: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get booking by ID
     * @route   GET /api/v1/bookings/:bookingId
     * @access  Private (Client/Vendor)
     */
    getBookingById: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get my bookings (as client or vendor)
     * @route   GET /api/v1/bookings
     * @access  Private
     * @query   role=client|vendor, status, startDate, endDate, page, limit
     */
    getMyBookings: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get booking statistics
     * @route   GET /api/v1/bookings/stats
     * @access  Private
     * @query   role=client|vendor
     */
    getBookingStats: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Accept booking (Vendor)
     * @route   POST /api/v1/bookings/:bookingId/accept
     * @access  Private (Vendor)
     */
    acceptBooking: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Reject booking (Vendor)
     * @route   POST /api/v1/bookings/:bookingId/reject
     * @access  Private (Vendor)
     * @body    { reason?: string }
     */
    rejectBooking: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Start booking (move to in progress)
     * @route   POST /api/v1/bookings/:bookingId/start
     * @access  Private (Vendor)
     */
    startBooking: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Mark booking as complete (Client or Vendor)
     * @route   POST /api/v1/bookings/:bookingId/complete
     * @access  Private
     */
    markComplete: (req: import("express").Request, res: Response, next: NextFunction) => void;
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
    cancelBooking: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Update booking notes
     * @route   PATCH /api/v1/bookings/:bookingId
     * @access  Private
     * @body    { clientNotes?, vendorNotes? }
     */
    updateBooking: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get vendor red flags (Admin)
     * @route   GET /api/v1/admin/bookings/red-flags
     * @access  Private (Admin)
     * @query   vendorId?, severity?, startDate?, endDate?, page, limit
     */
    getVendorRedFlags: (req: import("express").Request, res: Response, next: NextFunction) => void;
    createOffer: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getAvailableOffers: (req: import("express").Request, res: Response, next: NextFunction) => void;
    respondToOffer: (req: import("express").Request, res: Response, next: NextFunction) => void;
    counterOffer: (req: import("express").Request, res: Response, next: NextFunction) => void;
    acceptResponse: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getOfferById: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getMyOffers: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getMyResponses: (req: import("express").Request, res: Response, next: NextFunction) => void;
    closeOffer: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Preview booking price before creation
     * @route   POST /api/v1/bookings/price-preview
     * @access  Private (Client)
     * @body    { serviceId, serviceType, location? }
     */
    previewPrice: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: BookingController;
export default _default;
//# sourceMappingURL=booking.controller.d.ts.map