declare class NotificationHelper {
    /**
     * Extract ObjectId string from object or string
     * @returns string or undefined (never null)
     */
    private extractId;
    /**
     * Send booking created notification to BOTH client and vendor
     */
    notifyBookingCreated(booking: any): Promise<void>;
    /**
     * Send booking accepted notification to BOTH client and vendor
     */
    notifyBookingAccepted(booking: any): Promise<void>;
    /**
     * Send booking rejected notification to BOTH client and vendor
     */
    notifyBookingRejected(booking: any, reason?: string): Promise<void>;
    /**
     * Send booking started notification to BOTH client and vendor
     */
    notifyBookingStarted(booking: any): Promise<void>;
    /**
     * Send partial completion notification (when one party marks complete)
     */
    notifyPartialCompletion(booking: any, recipient: 'vendor' | 'client', completedBy: 'vendor' | 'client'): Promise<void>;
    /**
     * Send booking completed notification to BOTH client and vendor
     */
    notifyBookingCompleted(booking: any, recipientId: string, role: 'client' | 'vendor'): Promise<void>;
    /**
     * Send booking cancelled notification to BOTH parties
     */
    notifyBookingCancelled(booking: any, cancelledBy: 'client' | 'vendor', reason?: string): Promise<void>;
    /**
     * Send booking reminder notification
     */
    notifyBookingReminder(booking: any, recipientId: string, hoursUntil: number): Promise<void>;
    /**
     * Send payment received notification to vendor
     */
    notifyPaymentReceived(payment: any, vendorId: string): Promise<void>;
    /**
     * Send payment successful notification to client
     */
    notifyPaymentSuccessful(payment: any, clientId: string): Promise<void>;
    /**
     * Send payment failed notification
     */
    notifyPaymentFailed(payment: any, userId: string, reason?: string): Promise<void>;
    /**
     * Send payment refund notification
     */
    notifyPaymentRefunded(payment: any, userId: string): Promise<void>;
    /**
     * Send new message notification
     */
    notifyNewMessage(message: any, recipientId: string, senderName: string): Promise<void>;
    /**
     * Send new review notification to vendor
     */
    notifyNewReview(review: any, vendorId: string): Promise<void>;
    /**
     * Send review response notification to client
     */
    notifyReviewResponse(review: any, clientId: string, vendorName: string): Promise<void>;
    /**
     * Send dispute created notification
     */
    notifyDisputeCreated(dispute: any, respondentId: string, initiatorName: string): Promise<void>;
    /**
     * Send dispute updated notification
     */
    notifyDisputeUpdated(dispute: any, recipientId: string): Promise<void>;
    /**
     * Send dispute resolved notification
     */
    notifyDisputeResolved(dispute: any, recipientId: string): Promise<void>;
    /**
     * Send withdrawal approved notification
     */
    notifyWithdrawalApproved(withdrawal: any, vendorId: string): Promise<void>;
    /**
     * Send withdrawal rejected notification
     */
    notifyWithdrawalRejected(withdrawal: any, vendorId: string, reason?: string): Promise<void>;
    /**
     * Notify user about wallet credited (deposit successful)
     */
    notifyWalletCredited(transaction: any, userId: string): Promise<void>;
    /**
     * Notify user about withdrawal completed
     */
    notifyWithdrawalCompleted(withdrawal: any, userId: string): Promise<void>;
    /**
     * Send promotional notification
     */
    notifyPromotion(userIds: string[], title: string, message: string, actionUrl?: string, _data?: any): Promise<void>;
    /**
     * Send system announcement
     */
    notifySystemAnnouncement(userIds: string[], title: string, message: string, actionUrl?: string): Promise<void>;
    /**
     * Notify vendors about new offer in their service area
     */
    notifyVendorsAboutNewOffer(offer: any, nearbyVendorIds: string[]): Promise<void>;
    /**
     * Notify client when vendor responds to offer
     */
    notifyOfferResponse(offer: any, vendorId: string, response: any): Promise<void>;
    /**
     * Notify vendor when client accepts their response
     */
    notifyOfferAccepted(offer: any, vendorId: string, booking: any): Promise<void>;
    /**
     * Notify client when vendor makes counter offer
     */
    notifyCounterOffer(offer: any, vendorId: string, newPrice: number): Promise<void>;
    /**
     * Notify about order delivery based on distance
     */
    notifyOrderDelivery(order: any, status: 'shipped' | 'out_for_delivery' | 'nearby', estimatedTime?: string): Promise<void>;
    /**
     * Notify seller about order from nearby customer
     */
    notifySellerNewOrder(order: any, distance?: number): Promise<void>;
    /**
     * Notify customer about distance-based delivery fee
     */
    notifyDeliveryFeeCalculated(userId: string, orderId: string, deliveryFee: number, distance: number, estimatedTime: string): Promise<void>;
    /**
     * Send notification to a specific user (generic method)
     * Used for custom notifications like cancellation penalties
     */
    sendNotification(userId: string, title: string, message: string, type: string, data?: any): Promise<void>;
    /**
     * Notify all admin users
     * Used for red flags and other admin-relevant events
     */
    notifyAdmins(title: string, message: string, type: string, data?: any): Promise<void>;
    /**
   * Add this method to your notificationHelper utility
   * This sends a notification when a user successfully funds their wallet
   */
    /**
     * ============================================
     * CORRECTED notifyWalletFunded METHOD
     * ============================================
     *
     * Replace the existing notifyWalletFunded method in your
     * src/utils/notificationHelper.ts with this corrected version.
     *
     * This version:
     * 1. Uses the correct notificationService.createNotification structure
     * 2. Uses extractId helper like other notification methods
     * 3. Follows the same pattern as existing methods (e.g., notifyPaymentSuccessful)
     * 4. Uses NotificationType enum
     * 5. Has proper error handling
     */
    /**
     * Notify user about successful wallet funding
     */
    notifyWalletFunded(payment: any, userId: string, amount: number): Promise<void>;
    /**
     * Notify user about refund processed
     */
    notifyRefundProcessed(payment: any, userId: string, message: string): Promise<void>;
    notifySellerPaymentReleased(order: any, amount: number, platformFee: number, newBalance: number): Promise<void>;
    notifyOrderRefundProcessed(order: any, amount: number, newBalance: number, message: string): Promise<void>;
    notifyOrderCancelled(order: any, cancelledBy: 'customer' | 'seller', reason?: string): Promise<void>;
}
declare const _default: NotificationHelper;
export default _default;
//# sourceMappingURL=notificationHelper.d.ts.map