/**
 * Set users offline if they haven't been active for 5 minutes
 */
export declare const checkInactiveUsers: () => void;
/**
 * Sweep all online vendor–client pairs for physical proximity every 5 minutes.
 * Catches meetups when both users have the app open but no booking exists.
 */
export declare const runProximitySweep: () => void;
/**
 * Daily sweep for vendor–client pairs that had repeat bookings but went silent.
 * Catches off-platform revenue leaks regardless of whether the app is open.
 * Runs at 2am every day.
 */
export declare const runDropoutDetection: () => void;
/**
 * Send booking reminders at 24h and 1h before scheduled time.
 * Runs every 30 minutes. Uses flags on each booking to prevent duplicate sends.
 */
export declare const runBookingReminders: () => void;
/**
 * Remind clients to leave a review 24h after a booking is completed.
 * Runs daily at 10am.
 */
export declare const runReviewReminders: () => void;
/**
 * Nudge users with incomplete profiles.
 * - No avatar after 3 days (clients + vendors)
 * - No KYC submitted after 5 days of being a vendor
 * - No services added after 2 days of KYC approval
 * - No bookings after 7 days (clients only)
 * Runs daily at 9am.
 */
export declare const runIncompleteProfileReminders: () => void;
/**
 * Notify clients when their offer is expiring in ~6 hours and when it expires.
 * Runs every 30 minutes.
 */
export declare const runOfferExpiryNotifications: () => void;
/**
 * Re-engagement: notify users who haven't logged in for 14 or 30 days.
 * Also nudges clients with no recent booking and vendors with no recent booking received.
 * Runs daily at 11am.
 */
export declare const runReEngagementNotifications: () => void;
/**
 * Subscription expiry alerts: warn vendors 3 days before plan expires, notify on expiry.
 * Runs daily at 8am.
 */
export declare const runSubscriptionExpiryAlerts: () => void;
/**
 * Release promo slots for abandoned Paystack checkouts.
 * Runs every 15 minutes. Finds card payments still PENDING after 30 minutes
 * that hold a promo redemption (either pendingBookingData for standard bookings
 * or pendingOfferData for offer-based bookings), and releases the slot.
 */
export declare const runAbandonedPromoSlotCleanup: () => void;
/**
 * Nudge new vendors every ~2h to act on their pending / accepted / in-progress bookings.
 * Only sends between 8am–10pm Africa/Lagos (UTC+1, no DST).
 * Stops for a vendor as soon as they have any completed booking (they've done the loop once).
 * Caps at 12 reminders total per booking to avoid runaway nagging.
 * Only covers paid (escrowed) bookings created in the last 7 days, so unpaid or
 * long-abandoned bookings never trigger a reminder.
 */
export declare const runBookingActionReminders: () => void;
/**
 * Finish card payments the webhook missed.
 * Every 10 minutes, asks Paystack about card payments that are still PENDING
 * between 5 minutes and 48 hours after they started. If Paystack says the
 * charge succeeded, runs it through the webhook's own success handler, which
 * creates the booking / order or credits the wallet. That handler is
 * idempotent, so a payment the webhook or the app already finished is skipped.
 * Payments Paystack reports as abandoned or failed are left alone.
 */
export declare const runPendingPaymentReconciliation: () => void;
export declare const startCronJobs: () => void;
//# sourceMappingURL=cronJobs.d.ts.map