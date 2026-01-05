import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import bookingService from '../services/booking.service';
import offerService from '../services/offer.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';

class BookingController {
  // ==================== STANDARD BOOKING ENDPOINTS ====================

  /**
   * Create booking with immediate payment (ATOMIC)
   * @route   POST /api/v1/bookings
   * @access  Private (Client)
   * @body    { service, scheduledDate, scheduledTime?, serviceType?, location?, clientNotes?, paymentMethod: 'wallet' | 'card' }
   */
  public createBooking = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const clientId = req.user!.id;
      
      // Validate payment method is provided
      if (!req.body.paymentMethod) {
        return ResponseHandler.error(res, 'Payment method is required. Use "wallet" or "card"', 400);
      }

      const result = await bookingService.createBookingWithPayment(clientId, req.body);
      
      // ✅ FIX: Check for 'card' instead of 'paystack'
      // If card payment, return authorization URL for redirect
      if (req.body.paymentMethod === 'card' && result.authorizationUrl) {
        return ResponseHandler.created(res, 'Booking created. Complete payment to confirm.', {
          booking: result.booking,
          authorizationUrl: result.authorizationUrl,
          reference: result.booking.paymentReference, // Include reference for frontend
          message: 'Redirect user to authorizationUrl to complete payment',
        });
      }

      // If wallet payment, booking is already confirmed
      return ResponseHandler.created(res, 'Booking created and paid successfully!', {
        booking: result.booking,
        payment: result.payment,
      });
    }
  );

  /**
   * Verify Paystack payment (called after redirect or from webhook)
   * @route   GET /api/v1/bookings/payment/verify/:reference
   * @access  Private (Client)
   */
  public verifyPaystackPayment = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { reference } = req.params;
      
      const result = await bookingService.verifyPaystackPayment(reference);
      
      return ResponseHandler.success(res, 'Payment verified. Booking confirmed!', result);
    }
  );

  /**
   * Get booking by ID
   * @route   GET /api/v1/bookings/:bookingId
   * @access  Private (Client/Vendor)
   */
  public getBookingById = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { bookingId } = req.params;
      const userId = req.user!.id;
      const booking = await bookingService.getBookingById(bookingId, userId);
      return ResponseHandler.success(res, 'Booking retrieved successfully', { booking });
    }
  );

  /**
   * Get my bookings (as client or vendor)
   * @route   GET /api/v1/bookings
   * @access  Private
   * @query   role=client|vendor, status, startDate, endDate, page, limit
   */
  public getMyBookings = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const role = req.query.role as 'client' | 'vendor' || 'client';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const filters = {
        status: req.query.status as any,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };
      
      const result = await bookingService.getUserBookings(userId, role, filters, page, limit);
      return ResponseHandler.paginated(res, 'Bookings retrieved successfully', result.bookings, page, limit, result.total);
    }
  );

  /**
   * Get booking statistics
   * @route   GET /api/v1/bookings/stats
   * @access  Private
   * @query   role=client|vendor
   */
  public getBookingStats = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const role = req.query.role as 'client' | 'vendor' || 'client';
      const stats = await bookingService.getBookingStats(userId, role);
      return ResponseHandler.success(res, 'Booking statistics retrieved', { stats });
    }
  );

  // ==================== VENDOR BOOKING ACTIONS ====================

  /**
   * Accept booking (Vendor)
   * @route   POST /api/v1/bookings/:bookingId/accept
   * @access  Private (Vendor)
   */
  public acceptBooking = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { bookingId } = req.params;
      const vendorId = req.user!.id;
      const booking = await bookingService.acceptBooking(bookingId, vendorId);
      return ResponseHandler.success(res, 'Booking accepted successfully', { booking });
    }
  );

  /**
   * Reject booking (Vendor)
   * @route   POST /api/v1/bookings/:bookingId/reject
   * @access  Private (Vendor)
   * @body    { reason?: string }
   */
  public rejectBooking = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { bookingId } = req.params;
      const vendorId = req.user!.id;
      const { reason } = req.body;
      const booking = await bookingService.rejectBooking(bookingId, vendorId, reason);
      return ResponseHandler.success(res, 'Booking rejected. Client has been refunded.', { booking });
    }
  );

  /**
   * Start booking (move to in progress)
   * @route   POST /api/v1/bookings/:bookingId/start
   * @access  Private (Vendor)
   */
  public startBooking = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { bookingId } = req.params;
      const vendorId = req.user!.id;
      const booking = await bookingService.startBooking(bookingId, vendorId);
      return ResponseHandler.success(res, 'Booking started', { booking });
    }
  );

  // ==================== COMPLETION & CANCELLATION ====================

  /**
   * Mark booking as complete (Client or Vendor)
   * @route   POST /api/v1/bookings/:bookingId/complete
   * @access  Private
   */
  public markComplete = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { bookingId } = req.params;
      const userId = req.user!.id;
      const role = req.user!.isVendor ? 'vendor' : 'client';
      const booking = await bookingService.markComplete(bookingId, userId, role);
      
      const message = booking.status === 'completed' 
        ? 'Booking completed! Payment released to vendor.'
        : `You marked the booking as complete. Waiting for ${role === 'client' ? 'vendor' : 'client'} confirmation.`;
      
      return ResponseHandler.success(res, message, { booking });
    }
  );

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
  public cancelBooking = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { bookingId } = req.params;
      const userId = req.user!.id;
      const { reason } = req.body;
      const booking = await bookingService.cancelBooking(bookingId, userId, reason);
      
      let message = 'Booking cancelled.';
      
      // Customize message based on refund status
      if (booking.paymentStatus === 'refunded') {
        message = 'Booking cancelled. Full refund processed to your wallet.';
      } else if (booking.paymentStatus === 'partially_refunded') {
        message = `Booking cancelled. 80% refunded to your wallet (20% cancellation fee applied for late cancellation).`;
      }
      
      return ResponseHandler.success(res, message, { booking });
    }
  );

  /**
   * Update booking notes
   * @route   PATCH /api/v1/bookings/:bookingId
   * @access  Private
   * @body    { clientNotes?, vendorNotes? }
   */
  public updateBooking = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { bookingId } = req.params;
      const userId = req.user!.id;
      const booking = await bookingService.updateBooking(bookingId, userId, req.body);
      return ResponseHandler.success(res, 'Booking updated', { booking });
    }
  );

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get vendor red flags (Admin)
   * @route   GET /api/v1/admin/bookings/red-flags
   * @access  Private (Admin)
   * @query   vendorId?, severity?, startDate?, endDate?, page, limit
   */
  public getVendorRedFlags = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters = {
        vendorId: req.query.vendorId as string,
        severity: req.query.severity as 'HIGH' | 'MEDIUM',
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };
      
      const result = await bookingService.getVendorRedFlags(filters, page, limit);
      return ResponseHandler.paginated(
        res, 
        'Vendor red flags retrieved', 
        result.vendors, 
        page, 
        limit, 
        result.total
      );
    }
  );

  // ==================== OFFER-BASED BOOKING ENDPOINTS ====================

  public createOffer = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const clientId = req.user!.id;
      const offer = await offerService.createOffer(clientId, req.body);
      return ResponseHandler.created(res, 'Offer created successfully', { offer });
    }
  );

  public getAvailableOffers = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const vendorId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const filters: any = {
        category: req.query.category as string,
        priceMin: req.query.priceMin ? parseFloat(req.query.priceMin as string) : undefined,
        priceMax: req.query.priceMax ? parseFloat(req.query.priceMax as string) : undefined,
      };

      if (req.query.latitude && req.query.longitude) {
        filters.location = {
          latitude: parseFloat(req.query.latitude as string),
          longitude: parseFloat(req.query.longitude as string),
          maxDistance: req.query.maxDistance ? parseInt(req.query.maxDistance as string) : 20,
        };
      }

      const result = await offerService.getAvailableOffers(vendorId, filters, page, limit);
      return ResponseHandler.paginated(res, 'Available offers retrieved', result.offers, page, limit, result.total);
    }
  );

  public respondToOffer = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { offerId } = req.params;
      const vendorId = req.user!.id;
      const offer = await offerService.respondToOffer(offerId, vendorId, req.body);
      return ResponseHandler.success(res, 'Response submitted successfully', { offer });
    }
  );

  public counterOffer = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { offerId, responseId } = req.params;
      const clientId = req.user!.id;
      const { counterPrice } = req.body;
      const offer = await offerService.counterOffer(offerId, clientId, responseId, counterPrice);
      return ResponseHandler.success(res, 'Counter offer submitted', { offer });
    }
  );

  public acceptResponse = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { offerId, responseId } = req.params;
      const clientId = req.user!.id;
      const result = await offerService.acceptResponse(offerId, clientId, responseId);
      return ResponseHandler.success(res, 'Vendor selected and booking created', result);
    }
  );

  public getOfferById = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { offerId } = req.params;
      const userId = req.user!.id;
      const offer = await offerService.getOfferById(offerId, userId);
      return ResponseHandler.success(res, 'Offer retrieved successfully', { offer });
    }
  );

  public getMyOffers = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const clientId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await offerService.getClientOffers(clientId, page, limit);
      return ResponseHandler.paginated(res, 'Your offers retrieved', result.offers, page, limit, result.total);
    }
  );

  public getMyResponses = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const vendorId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await offerService.getVendorResponses(vendorId, page, limit);
      return ResponseHandler.paginated(res, 'Your responses retrieved', result.offers, page, limit, result.total);
    }
  );

  public closeOffer = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { offerId } = req.params;
      const clientId = req.user!.id;
      const offer = await offerService.closeOffer(offerId, clientId);
      return ResponseHandler.success(res, 'Offer closed', { offer });
    }
  );


  
/**
 * Preview booking price before creation
 * @route   POST /api/v1/bookings/price-preview
 * @access  Private (Client)
 * @body    { serviceId, serviceType, location? }
 */
public previewPrice = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const { serviceId, serviceType, location } = req.body;
    
    if (!serviceId) {
      return ResponseHandler.error(res, 'Service ID is required', 400);
    }
    
    const preview = await bookingService.previewBookingPrice({
      serviceId,
      serviceType: serviceType || 'shop',
      location,
    });
    
    return ResponseHandler.success(res, 'Price preview calculated', preview);
  }
);
}

export default new BookingController();