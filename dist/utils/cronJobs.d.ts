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
export declare const startCronJobs: () => void;
//# sourceMappingURL=cronJobs.d.ts.map