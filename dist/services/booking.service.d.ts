import { IBooking } from '../models/Booking';
import { BookingStatus } from '../types';
declare class BookingService {
    /**
     * Create booking with immediate payment (ATOMIC)
     * Booking cannot exist without successful payment
     */
    createBookingWithPayment(clientId: string, data: {
        service: string;
        scheduledDate: Date;
        scheduledTime?: string;
        serviceType?: 'home' | 'shop';
        location?: {
            address: string;
            city: string;
            state: string;
            coordinates: [number, number];
        };
        clientNotes?: string;
        paymentMethod: 'wallet' | 'card';
    }): Promise<{
        booking: IBooking;
        payment: any;
        authorizationUrl?: string;
    }>;
    /**
     * Verify Paystack payment and activate booking (called from webhook)
     */
    verifyPaystackPayment(reference: string): Promise<{
        booking: IBooking;
        payment: any;
    }>;
    /**
     * Handle failed/expired Paystack payment - cleanup unpaid booking
     */
    handleFailedPaystackPayment(reference: string, reason?: string): Promise<void>;
    /**
     * Cleanup expired unpaid bookings (run via cron job)
     */
    cleanupExpiredBookings(): Promise<number>;
    /**
     * Preview booking price (calculate total including distance charge)
     * Call this BEFORE creating booking to show user the exact amount
     */
    previewBookingPrice(data: {
        serviceId: string;
        serviceType: 'home' | 'shop';
        location?: {
            coordinates: [number, number];
        };
    }): Promise<{
        servicePrice: number;
        distanceCharge: number;
        totalAmount: number;
        distance?: number;
    }>;
    /**
     * Cancel booking with cancellation policy enforcement
     */
    cancelBooking(bookingId: string, userId: string, reason?: string): Promise<IBooking>;
    /**
     * Handle client cancellation with penalty logic
     */
    private handleClientCancellation;
    /**
     * Handle vendor cancellation with red flag logic
     * ✅ UPDATED: Now uses RedFlag service
     */
    private handleVendorCancellation;
    /**
     * Legacy red flag creation (fallback if RedFlag service fails)
     * @deprecated Use redFlagService.detectVendorLateCancellation instead
     */
    private createVendorRedFlagLegacy;
    /**
     * Process full refund to client
     */
    private processFullRefund;
    /**
     * Get appointment date/time as a single Date object (in UTC)
     * ✅ FIXED: Properly handles Nigeria timezone (WAT = UTC+1)
     *
     * scheduledTime is stored in LOCAL time (Nigeria WAT)
     * We convert it to UTC for comparison with server time
     */
    private getAppointmentDateTime;
    /**
     * Accept booking (Vendor)
     */
    acceptBooking(bookingId: string, vendorId: string): Promise<IBooking>;
    /**
     * Reject booking (Vendor)
     * ✅ UPDATED: Now uses RedFlag service
     */
    rejectBooking(bookingId: string, vendorId: string, reason?: string): Promise<IBooking>;
    /**
     * Start booking (move to in progress)
     */
    startBooking(bookingId: string, vendorId: string): Promise<IBooking>;
    /**
     * Mark booking as complete (by client or vendor)
     */
    markComplete(bookingId: string, userId: string, role: 'client' | 'vendor'): Promise<IBooking>;
    /**
     * Get booking by ID
     */
    getBookingById(bookingId: string, userId: string): Promise<IBooking>;
    /**
     * Get user bookings
     */
    getUserBookings(userId: string, role: 'client' | 'vendor', filters?: {
        status?: BookingStatus;
        startDate?: Date;
        endDate?: Date;
    }, page?: number, limit?: number): Promise<{
        bookings: IBooking[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get booking statistics
     */
    getBookingStats(userId: string, role: 'client' | 'vendor'): Promise<any>;
    /**
     * Update booking (add notes, etc.)
     */
    updateBooking(bookingId: string, userId: string, updates: {
        clientNotes?: string;
        vendorNotes?: string;
    }): Promise<IBooking>;
    /**
     * Get all vendor red flags (Admin)
     * ✅ UPDATED: Now uses RedFlag service for comprehensive data
     */
    getVendorRedFlags(filters?: {
        vendorId?: string;
        severity?: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL';
        startDate?: Date;
        endDate?: Date;
    }, page?: number, limit?: number): Promise<any>;
    /**
     * Legacy vendor red flags query
     * @deprecated Use redFlagService.getRedFlags instead
     */
    private getVendorRedFlagsLegacy;
}
declare const _default: BookingService;
export default _default;
//# sourceMappingURL=booking.service.d.ts.map