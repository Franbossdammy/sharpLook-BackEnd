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
 * that hold a promo redemption, and releases the slot back to the pool.
 */
export declare const runAbandonedPromoSlotCleanup: () => void;
export declare const startCronJobs: () => void;
//# sourceMappingURL=cronJobs.d.ts.map