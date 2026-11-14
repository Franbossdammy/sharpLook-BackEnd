"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCronJobs = exports.runPendingPaymentReconciliation = exports.runBookingActionReminders = exports.runAbandonedPromoSlotCleanup = exports.runSubscriptionExpiryAlerts = exports.runReEngagementNotifications = exports.runOfferExpiryNotifications = exports.runIncompleteProfileReminders = exports.runReviewReminders = exports.runBookingReminders = exports.runDropoutDetection = exports.runProximitySweep = exports.checkInactiveUsers = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const User_1 = __importDefault(require("../models/User"));
const Booking_1 = __importDefault(require("../models/Booking"));
const Payment_1 = __importDefault(require("../models/Payment"));
const logger_1 = __importDefault(require("./logger"));
const redFlag_service_1 = __importDefault(require("../services/redFlag.service"));
const promo_service_1 = __importDefault(require("../services/promo.service"));
const notificationHelper_1 = __importDefault(require("./notificationHelper"));
const paystackHelper_1 = __importDefault(require("./paystackHelper"));
const types_1 = require("../types");
const Review_1 = __importDefault(require("../models/Review"));
const Offer_1 = __importDefault(require("../models/Offer"));
/**
 * Set users offline if they haven't been active for 5 minutes
 */
const checkInactiveUsers = () => {
    node_cron_1.default.schedule('*/2 * * * *', async () => {
        try {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const result = await User_1.default.updateMany({ isOnline: true, lastSeen: { $lt: fiveMinutesAgo } }, { $set: { isOnline: false } });
            if (result.modifiedCount > 0) {
                logger_1.default.info(`Set ${result.modifiedCount} inactive users to offline`);
            }
        }
        catch (error) {
            logger_1.default.error('Error checking inactive users:', error);
        }
    });
};
exports.checkInactiveUsers = checkInactiveUsers;
/**
 * Sweep all online vendor–client pairs for physical proximity every 5 minutes.
 * Catches meetups when both users have the app open but no booking exists.
 */
const runProximitySweep = () => {
    node_cron_1.default.schedule('*/5 * * * *', async () => {
        try {
            await redFlag_service_1.default.runProximitySweep();
        }
        catch (error) {
            logger_1.default.error('Proximity sweep cron error:', error);
        }
    });
};
exports.runProximitySweep = runProximitySweep;
/**
 * Daily sweep for vendor–client pairs that had repeat bookings but went silent.
 * Catches off-platform revenue leaks regardless of whether the app is open.
 * Runs at 2am every day.
 */
const runDropoutDetection = () => {
    node_cron_1.default.schedule('0 2 * * *', async () => {
        try {
            logger_1.default.info('Running repeat-client dropout detection...');
            await redFlag_service_1.default.runDropoutDetection();
            logger_1.default.info('Dropout detection complete');
        }
        catch (error) {
            logger_1.default.error('Dropout detection cron error:', error);
        }
    });
};
exports.runDropoutDetection = runDropoutDetection;
/**
 * Send booking reminders at 24h and 1h before scheduled time.
 * Runs every 30 minutes. Uses flags on each booking to prevent duplicate sends.
 */
const runBookingReminders = () => {
    node_cron_1.default.schedule('*/30 * * * *', async () => {
        try {
            const now = new Date();
            // 24h window: bookings scheduled between 23.5h and 24.5h from now
            const window24hStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);
            const window24hEnd = new Date(now.getTime() + 24.5 * 60 * 60 * 1000);
            // 1h window: bookings scheduled between 0.5h and 1.5h from now
            const window1hStart = new Date(now.getTime() + 0.5 * 60 * 60 * 1000);
            const window1hEnd = new Date(now.getTime() + 1.5 * 60 * 60 * 1000);
            const [bookings24h, bookings1h] = await Promise.all([
                Booking_1.default.find({
                    status: types_1.BookingStatus.ACCEPTED,
                    scheduledDate: { $gte: window24hStart, $lte: window24hEnd },
                    reminder24hSent: { $ne: true },
                }).populate('client vendor', 'firstName'),
                Booking_1.default.find({
                    status: types_1.BookingStatus.ACCEPTED,
                    scheduledDate: { $gte: window1hStart, $lte: window1hEnd },
                    reminder1hSent: { $ne: true },
                }).populate('client vendor', 'firstName'),
            ]);
            for (const booking of bookings24h) {
                const clientId = booking.client?._id?.toString() || booking.client?.toString();
                const vendorId = booking.vendor?._id?.toString() || booking.vendor?.toString();
                if (clientId)
                    await notificationHelper_1.default.notifyBookingReminder(booking, clientId, 24);
                if (vendorId)
                    await notificationHelper_1.default.notifyBookingReminder(booking, vendorId, 24);
                await Booking_1.default.findByIdAndUpdate(booking._id, { reminder24hSent: true });
            }
            for (const booking of bookings1h) {
                const clientId = booking.client?._id?.toString() || booking.client?.toString();
                const vendorId = booking.vendor?._id?.toString() || booking.vendor?.toString();
                if (clientId)
                    await notificationHelper_1.default.notifyBookingReminder(booking, clientId, 1);
                if (vendorId)
                    await notificationHelper_1.default.notifyBookingReminder(booking, vendorId, 1);
                await Booking_1.default.findByIdAndUpdate(booking._id, { reminder1hSent: true });
            }
            const total = bookings24h.length + bookings1h.length;
            if (total > 0)
                logger_1.default.info(`Booking reminders sent: ${bookings24h.length} (24h), ${bookings1h.length} (1h)`);
        }
        catch (error) {
            logger_1.default.error('Booking reminder cron error:', error);
        }
    });
};
exports.runBookingReminders = runBookingReminders;
/**
 * Remind clients to leave a review 24h after a booking is completed.
 * Runs daily at 10am.
 */
const runReviewReminders = () => {
    node_cron_1.default.schedule('0 10 * * *', async () => {
        try {
            const now = new Date();
            const window24hStart = new Date(now.getTime() - 25 * 60 * 60 * 1000);
            const window24hEnd = new Date(now.getTime() - 23 * 60 * 60 * 1000);
            const completedBookings = await Booking_1.default.find({
                status: types_1.BookingStatus.COMPLETED,
                updatedAt: { $gte: window24hStart, $lte: window24hEnd },
            }).populate('client vendor', 'firstName vendorProfile');
            for (const booking of completedBookings) {
                const clientId = booking.client?._id?.toString() || booking.client?.toString();
                const bookingId = booking._id.toString();
                const vendorName = booking.vendor?.vendorProfile?.businessName || 'your beauty pro';
                if (!clientId)
                    continue;
                const alreadyReviewed = await Review_1.default.exists({ booking: booking._id, reviewer: clientId });
                if (alreadyReviewed)
                    continue;
                await notificationHelper_1.default.notifyReviewReminder(clientId, bookingId, vendorName);
            }
            if (completedBookings.length > 0) {
                logger_1.default.info(`Review reminders sent for ${completedBookings.length} booking(s)`);
            }
        }
        catch (error) {
            logger_1.default.error('Review reminder cron error:', error);
        }
    });
};
exports.runReviewReminders = runReviewReminders;
/**
 * Nudge users with incomplete profiles.
 * - No avatar after 3 days (clients + vendors)
 * - No KYC submitted after 5 days of being a vendor
 * - No services added after 2 days of KYC approval
 * - No bookings after 7 days (clients only)
 * Runs daily at 9am.
 */
const runIncompleteProfileReminders = () => {
    node_cron_1.default.schedule('0 9 * * *', async () => {
        try {
            const now = new Date();
            const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
            // No avatar — 3 days after signup (send once, at the 3-day mark ±12h)
            const noAvatarUsers = await User_1.default.find({
                avatar: { $in: [null, '', undefined] },
                createdAt: { $gte: new Date(daysAgo(3).getTime() - 12 * 60 * 60 * 1000), $lte: new Date(daysAgo(3).getTime() + 12 * 60 * 60 * 1000) },
            }).select('_id');
            for (const user of noAvatarUsers) {
                await notificationHelper_1.default.notifyIncompleteProfile(user._id.toString(), 'avatar');
            }
            // No KYC submitted — 5 days after becoming a vendor
            const noKycVendors = await User_1.default.find({
                isVendor: true,
                'vendorProfile.kycStatus': { $in: [null, 'not_submitted', undefined] },
                'vendorProfile.createdAt': {
                    $gte: new Date(daysAgo(5).getTime() - 12 * 60 * 60 * 1000),
                    $lte: new Date(daysAgo(5).getTime() + 12 * 60 * 60 * 1000),
                },
            }).select('_id');
            for (const vendor of noKycVendors) {
                await notificationHelper_1.default.notifyIncompleteProfile(vendor._id.toString(), 'kyc');
            }
            // No services added — 2 days after KYC approved
            const noServiceVendors = await User_1.default.find({
                isVendor: true,
                'vendorProfile.kycStatus': 'approved',
                'vendorProfile.kycApprovedAt': {
                    $gte: new Date(daysAgo(2).getTime() - 12 * 60 * 60 * 1000),
                    $lte: new Date(daysAgo(2).getTime() + 12 * 60 * 60 * 1000),
                },
            }).select('_id vendorProfile');
            for (const vendor of noServiceVendors) {
                const serviceCount = vendor.vendorProfile?.services?.length || 0;
                if (serviceCount === 0) {
                    await notificationHelper_1.default.notifyIncompleteProfile(vendor._id.toString(), 'services');
                }
            }
            // No first booking — 7 days after signup (clients only)
            const noBookingClients = await User_1.default.find({
                isVendor: false,
                role: types_1.UserRole.CLIENT,
                createdAt: {
                    $gte: new Date(daysAgo(7).getTime() - 12 * 60 * 60 * 1000),
                    $lte: new Date(daysAgo(7).getTime() + 12 * 60 * 60 * 1000),
                },
            }).select('_id');
            for (const client of noBookingClients) {
                const hasBooked = await Booking_1.default.exists({ client: client._id });
                if (!hasBooked) {
                    await notificationHelper_1.default.notifyIncompleteProfile(client._id.toString(), 'first_booking');
                }
            }
            logger_1.default.info('Incomplete profile reminders cron complete');
        }
        catch (error) {
            logger_1.default.error('Incomplete profile reminder cron error:', error);
        }
    });
};
exports.runIncompleteProfileReminders = runIncompleteProfileReminders;
/**
 * Notify clients when their offer is expiring in ~6 hours and when it expires.
 * Runs every 30 minutes.
 */
const runOfferExpiryNotifications = () => {
    node_cron_1.default.schedule('*/30 * * * *', async () => {
        try {
            const now = new Date();
            // Expiring soon: expires in 5.5–6.5h, not yet notified
            const expiringSoonStart = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
            const expiringSoonEnd = new Date(now.getTime() + 6.5 * 60 * 60 * 1000);
            const expiringSoon = await Offer_1.default.find({
                status: 'open',
                expiresAt: { $gte: expiringSoonStart, $lte: expiringSoonEnd },
                expiryWarningSent: { $ne: true },
            }).populate('client', '_id');
            for (const offer of expiringSoon) {
                const clientId = offer.client?._id?.toString() || offer.client?.toString();
                if (clientId) {
                    await notificationHelper_1.default.notifyOfferExpiring(clientId, offer._id.toString(), offer.title || 'your offer');
                    await Offer_1.default.findByIdAndUpdate(offer._id, { expiryWarningSent: true });
                }
            }
            // Just expired: expired in the last 30 minutes, not yet notified
            const justExpiredStart = new Date(now.getTime() - 30 * 60 * 1000);
            const justExpired = await Offer_1.default.find({
                status: 'expired',
                expiresAt: { $gte: justExpiredStart, $lte: now },
                expiryNotifiedSent: { $ne: true },
            }).populate('client', '_id');
            for (const offer of justExpired) {
                const clientId = offer.client?._id?.toString() || offer.client?.toString();
                if (clientId) {
                    await notificationHelper_1.default.notifyOfferExpired(clientId, offer._id.toString(), offer.title || 'your offer');
                    await Offer_1.default.findByIdAndUpdate(offer._id, { expiryNotifiedSent: true });
                }
            }
            const total = expiringSoon.length + justExpired.length;
            if (total > 0)
                logger_1.default.info(`Offer expiry: ${expiringSoon.length} expiring-soon, ${justExpired.length} just-expired`);
        }
        catch (error) {
            logger_1.default.error('Offer expiry cron error:', error);
        }
    });
};
exports.runOfferExpiryNotifications = runOfferExpiryNotifications;
/**
 * Re-engagement: notify users who haven't logged in for 14 or 30 days.
 * Also nudges clients with no recent booking and vendors with no recent booking received.
 * Runs daily at 11am.
 */
const runReEngagementNotifications = () => {
    node_cron_1.default.schedule('0 11 * * *', async () => {
        try {
            const now = new Date();
            const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
            // 14-day inactive — notify once at the 14-day mark (±12h window)
            const inactive14 = await User_1.default.find({
                lastSeen: {
                    $gte: new Date(daysAgo(14).getTime() - 12 * 60 * 60 * 1000),
                    $lte: new Date(daysAgo(14).getTime() + 12 * 60 * 60 * 1000),
                },
            }).select('_id isVendor role');
            for (const user of inactive14) {
                const role = user.isVendor ? 'vendor' : 'client';
                await notificationHelper_1.default.notifyReEngagement(user._id.toString(), role, 14);
            }
            // 30-day inactive — notify once at the 30-day mark (±12h window)
            const inactive30 = await User_1.default.find({
                lastSeen: {
                    $gte: new Date(daysAgo(30).getTime() - 12 * 60 * 60 * 1000),
                    $lte: new Date(daysAgo(30).getTime() + 12 * 60 * 60 * 1000),
                },
            }).select('_id isVendor');
            for (const user of inactive30) {
                const role = user.isVendor ? 'vendor' : 'client';
                await notificationHelper_1.default.notifyReEngagement(user._id.toString(), role, 30);
            }
            // Clients with no booking in 30 days
            const thirtyDaysAgo = daysAgo(30);
            const clientsWithNoBooking = await User_1.default.find({
                isVendor: false,
                role: types_1.UserRole.CLIENT,
                createdAt: { $lt: thirtyDaysAgo },
            }).select('_id');
            for (const client of clientsWithNoBooking) {
                const recentBooking = await Booking_1.default.exists({
                    client: client._id,
                    createdAt: { $gte: thirtyDaysAgo },
                });
                if (!recentBooking) {
                    await notificationHelper_1.default.notifyNoBookingsClient(client._id.toString());
                }
            }
            // Vendors with no booking received in 14 days
            const fourteenDaysAgo = daysAgo(14);
            const activeVendors = await User_1.default.find({
                isVendor: true,
                'vendorProfile.kycStatus': 'approved',
                createdAt: { $lt: fourteenDaysAgo },
            }).select('_id');
            for (const vendor of activeVendors) {
                const recentBooking = await Booking_1.default.exists({
                    vendor: vendor._id,
                    createdAt: { $gte: fourteenDaysAgo },
                });
                if (!recentBooking) {
                    await notificationHelper_1.default.notifyNoBookingsVendor(vendor._id.toString());
                }
            }
            logger_1.default.info('Re-engagement cron complete');
        }
        catch (error) {
            logger_1.default.error('Re-engagement cron error:', error);
        }
    });
};
exports.runReEngagementNotifications = runReEngagementNotifications;
/**
 * Subscription expiry alerts: warn vendors 3 days before plan expires, notify on expiry.
 * Runs daily at 8am.
 */
const runSubscriptionExpiryAlerts = () => {
    node_cron_1.default.schedule('0 8 * * *', async () => {
        try {
            const now = new Date();
            const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
            const windowStart = new Date(in3days.getTime() - 12 * 60 * 60 * 1000);
            const windowEnd = new Date(in3days.getTime() + 12 * 60 * 60 * 1000);
            // Expiring in ~3 days
            const expiringSoon = await User_1.default.find({
                isVendor: true,
                'vendorProfile.subscriptionExpiresAt': { $gte: windowStart, $lte: windowEnd },
                'vendorProfile.subscriptionStatus': 'active',
            }).select('_id vendorProfile');
            for (const vendor of expiringSoon) {
                const planName = vendor.vendorProfile?.subscriptionPlan || 'current';
                await notificationHelper_1.default.notifyPlanExpiringSoon(vendor._id.toString(), planName, 3);
            }
            // Just expired (within last 24h)
            const justExpiredStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const justExpired = await User_1.default.find({
                isVendor: true,
                'vendorProfile.subscriptionExpiresAt': { $gte: justExpiredStart, $lte: now },
                'vendorProfile.subscriptionStatus': 'expired',
            }).select('_id vendorProfile');
            for (const vendor of justExpired) {
                const planName = vendor.vendorProfile?.subscriptionPlan || 'current';
                await notificationHelper_1.default.notifyPlanExpired(vendor._id.toString(), planName);
            }
            logger_1.default.info(`Subscription alerts: ${expiringSoon.length} expiring-soon, ${justExpired.length} just-expired`);
        }
        catch (error) {
            logger_1.default.error('Subscription expiry cron error:', error);
        }
    });
};
exports.runSubscriptionExpiryAlerts = runSubscriptionExpiryAlerts;
/**
 * Release promo slots for abandoned Paystack checkouts.
 * Runs every 15 minutes. Finds card payments still PENDING after 30 minutes
 * that hold a promo redemption (either pendingBookingData for standard bookings
 * or pendingOfferData for offer-based bookings), and releases the slot.
 */
const runAbandonedPromoSlotCleanup = () => {
    node_cron_1.default.schedule('*/15 * * * *', async () => {
        try {
            const cutoff = new Date(Date.now() - 30 * 60 * 1000);
            const stale = await Payment_1.default.find({
                status: types_1.PaymentStatus.PENDING,
                paymentMethod: 'card',
                initiatedAt: { $lt: cutoff },
                $or: [
                    { 'metadata.pendingBookingData.promoApplied': true },
                    { 'metadata.pendingOfferData.promoApplied': true },
                ],
            });
            let released = 0;
            for (const p of stale) {
                const bd = p.metadata?.pendingBookingData;
                const od = p.metadata?.pendingOfferData;
                if (bd?.promoCampaignId && bd?.promoRedemptionId) {
                    await promo_service_1.default.releaseSlot(bd.promoCampaignId, bd.promoRedemptionId);
                    released++;
                    bd.promoApplied = false;
                    bd.promoCampaignId = null;
                    bd.promoRedemptionId = null;
                    p.markModified('metadata');
                    await p.save();
                }
                else if (od?.promoCampaignId && od?.promoRedemptionId) {
                    await promo_service_1.default.releaseSlot(od.promoCampaignId, od.promoRedemptionId);
                    released++;
                    od.promoApplied = false;
                    od.promoCampaignId = null;
                    od.promoRedemptionId = null;
                    p.markModified('metadata');
                    await p.save();
                }
            }
            if (released > 0) {
                logger_1.default.info(`Released ${released} abandoned promo slots`);
            }
        }
        catch (error) {
            logger_1.default.error('Abandoned promo slot cleanup cron error:', error);
        }
    });
};
exports.runAbandonedPromoSlotCleanup = runAbandonedPromoSlotCleanup;
/**
 * Nudge new vendors every ~2h to act on their pending / accepted / in-progress bookings.
 * Only sends between 8am–10pm Africa/Lagos (UTC+1, no DST).
 * Stops for a vendor as soon as they have any completed booking (they've done the loop once).
 * Caps at 12 reminders total per booking to avoid runaway nagging.
 * Only covers paid (escrowed) bookings created in the last 7 days, so unpaid or
 * long-abandoned bookings never trigger a reminder.
 */
const runBookingActionReminders = () => {
    node_cron_1.default.schedule('0 */2 * * *', async () => {
        try {
            const now = new Date();
            // Africa/Lagos is UTC+1 with no DST.
            const lagosHour = (now.getUTCHours() + 1) % 24;
            if (lagosHour < 8 || lagosHour >= 22) {
                return;
            }
            const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const bookings = await Booking_1.default.find({
                status: {
                    $in: [types_1.BookingStatus.PENDING, types_1.BookingStatus.ACCEPTED, types_1.BookingStatus.IN_PROGRESS],
                },
                paymentStatus: 'escrowed',
                createdAt: { $gte: sevenDaysAgo },
                $or: [
                    { actionReminderLastSentAt: { $exists: false } },
                    { actionReminderLastSentAt: null },
                    { actionReminderLastSentAt: { $lte: twoHoursAgo } },
                ],
            })
                .populate('vendor', '_id')
                .populate('client', 'firstName')
                .populate('service', 'name');
            let sent = 0;
            for (const booking of bookings) {
                const vendorId = booking.vendor?._id?.toString() || booking.vendor?.toString();
                if (!vendorId)
                    continue;
                // Skip vendors who have already completed a booking (spoon-feeding is over)
                const alreadyCompleted = await Booking_1.default.exists({
                    vendor: vendorId,
                    status: types_1.BookingStatus.COMPLETED,
                });
                if (alreadyCompleted)
                    continue;
                const currentStatus = String(booking.status);
                const countForCurrentStatus = booking.actionReminderForStatus === currentStatus
                    ? booking.actionReminderCount ?? 0
                    : 0;
                // Cap at 12 per status (2h × 12 ≈ 3 waking days worth)
                if (countForCurrentStatus >= 12)
                    continue;
                await notificationHelper_1.default.notifyBookingActionReminder(booking, vendorId);
                await Booking_1.default.findByIdAndUpdate(booking._id, {
                    $set: {
                        actionReminderLastSentAt: now,
                        actionReminderCount: countForCurrentStatus + 1,
                        actionReminderForStatus: currentStatus,
                    },
                });
                sent++;
            }
            if (sent > 0) {
                logger_1.default.info(`Booking action reminders sent: ${sent}`);
            }
        }
        catch (error) {
            logger_1.default.error('Booking action reminder cron error:', error);
        }
    });
};
exports.runBookingActionReminders = runBookingActionReminders;
/**
 * Finish card payments the webhook missed.
 * Every 10 minutes, asks Paystack about card payments that are still PENDING
 * between 5 minutes and 48 hours after they started. If Paystack says the
 * charge succeeded, runs it through the webhook's own success handler, which
 * creates the booking / order or credits the wallet. That handler is
 * idempotent, so a payment the webhook or the app already finished is skipped.
 * Payments Paystack reports as abandoned or failed are left alone.
 */
const runPendingPaymentReconciliation = () => {
    node_cron_1.default.schedule('*/10 * * * *', async () => {
        try {
            const now = Date.now();
            const pending = await Payment_1.default.find({
                paymentMethod: 'card',
                // FAILED too: the app's verify call used to mark still-in-progress
                // top-ups (e.g. bank transfers) as failed. We only act when Paystack
                // itself says 'success', so a genuinely failed charge is left alone.
                status: { $in: [types_1.PaymentStatus.PENDING, types_1.PaymentStatus.FAILED] },
                // Only payment types the webhook handler fully processes (bookings, offers,
                // wallet top-ups, orders). Anything else would hit its generic fallback,
                // which marks the payment completed without doing the type-specific work.
                reference: { $regex: /^(BOOKING-|BOOK-|OFFER-|PAY-|WALLET-FUND-|ORD-PAY-|ORDER-)/ },
                createdAt: {
                    $gte: new Date(now - 48 * 60 * 60 * 1000),
                    $lte: new Date(now - 5 * 60 * 1000),
                },
            })
                .select('reference')
                .sort({ createdAt: 1 })
                .limit(50)
                .lean();
            if (pending.length === 0)
                return;
            // Lazy import: the webhook controller pulls in most services
            const { handleChargeSuccess } = await Promise.resolve().then(() => __importStar(require('../controllers/webhook.controller')));
            let recovered = 0;
            for (const p of pending) {
                try {
                    const tx = await paystackHelper_1.default.verifyPayment(p.reference);
                    if (tx?.status !== 'success')
                        continue;
                    await handleChargeSuccess(tx);
                    recovered++;
                    logger_1.default.warn(`💡 Reconciliation recovered paid card payment the webhook missed: ${p.reference}`);
                }
                catch (err) {
                    logger_1.default.error(`Reconciliation failed for ${p.reference}: ${err?.message}`);
                }
            }
            if (recovered > 0) {
                logger_1.default.warn(`Payment reconciliation: recovered ${recovered} of ${pending.length} pending card payments`);
            }
        }
        catch (error) {
            logger_1.default.error('Payment reconciliation cron error:', error);
        }
    });
};
exports.runPendingPaymentReconciliation = runPendingPaymentReconciliation;
const startCronJobs = () => {
    (0, exports.checkInactiveUsers)();
    (0, exports.runProximitySweep)();
    (0, exports.runDropoutDetection)();
    (0, exports.runBookingReminders)();
    (0, exports.runReviewReminders)();
    (0, exports.runIncompleteProfileReminders)();
    (0, exports.runOfferExpiryNotifications)();
    (0, exports.runReEngagementNotifications)();
    (0, exports.runSubscriptionExpiryAlerts)();
    (0, exports.runAbandonedPromoSlotCleanup)();
    (0, exports.runBookingActionReminders)();
    (0, exports.runPendingPaymentReconciliation)();
    logger_1.default.info('Cron jobs started: inactive users, proximity sweep, dropout detection, booking reminders, review reminders, profile nudges, offer expiry, re-engagement, subscription alerts, abandoned promo cleanup, booking action reminders, payment reconciliation');
};
exports.startCronJobs = startCronJobs;
//# sourceMappingURL=cronJobs.js.map