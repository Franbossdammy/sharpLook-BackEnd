import cron from 'node-cron';
import User from '../models/User';
import Booking from '../models/Booking';
import Payment from '../models/Payment';
import logger from './logger';
import redFlagService from '../services/redFlag.service';
import promoService from '../services/promo.service';
import notificationHelper from './notificationHelper';
import { BookingStatus, PaymentStatus, UserRole } from '../types';
import Review from '../models/Review';
import Offer from '../models/Offer';

/**
 * Set users offline if they haven't been active for 5 minutes
 */
export const checkInactiveUsers = () => {
  cron.schedule('*/2 * * * *', async () => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const result = await User.updateMany(
        { isOnline: true, lastSeen: { $lt: fiveMinutesAgo } },
        { $set: { isOnline: false } }
      );
      if (result.modifiedCount > 0) {
        logger.info(`Set ${result.modifiedCount} inactive users to offline`);
      }
    } catch (error) {
      logger.error('Error checking inactive users:', error);
    }
  });
};

/**
 * Sweep all online vendor–client pairs for physical proximity every 5 minutes.
 * Catches meetups when both users have the app open but no booking exists.
 */
export const runProximitySweep = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      await redFlagService.runProximitySweep();
    } catch (error) {
      logger.error('Proximity sweep cron error:', error);
    }
  });
};

/**
 * Daily sweep for vendor–client pairs that had repeat bookings but went silent.
 * Catches off-platform revenue leaks regardless of whether the app is open.
 * Runs at 2am every day.
 */
export const runDropoutDetection = () => {
  cron.schedule('0 2 * * *', async () => {
    try {
      logger.info('Running repeat-client dropout detection...');
      await redFlagService.runDropoutDetection();
      logger.info('Dropout detection complete');
    } catch (error) {
      logger.error('Dropout detection cron error:', error);
    }
  });
};

/**
 * Send booking reminders at 24h and 1h before scheduled time.
 * Runs every 30 minutes. Uses flags on each booking to prevent duplicate sends.
 */
export const runBookingReminders = () => {
  cron.schedule('*/30 * * * *', async () => {
    try {
      const now = new Date();

      // 24h window: bookings scheduled between 23.5h and 24.5h from now
      const window24hStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);
      const window24hEnd   = new Date(now.getTime() + 24.5 * 60 * 60 * 1000);

      // 1h window: bookings scheduled between 0.5h and 1.5h from now
      const window1hStart  = new Date(now.getTime() + 0.5 * 60 * 60 * 1000);
      const window1hEnd    = new Date(now.getTime() + 1.5 * 60 * 60 * 1000);

      const [bookings24h, bookings1h] = await Promise.all([
        Booking.find({
          status: BookingStatus.ACCEPTED,
          scheduledDate: { $gte: window24hStart, $lte: window24hEnd },
          reminder24hSent: { $ne: true },
        }).populate('client vendor', 'firstName'),

        Booking.find({
          status: BookingStatus.ACCEPTED,
          scheduledDate: { $gte: window1hStart,  $lte: window1hEnd },
          reminder1hSent:  { $ne: true },
        }).populate('client vendor', 'firstName'),
      ]);

      for (const booking of bookings24h) {
        const clientId = (booking.client as any)?._id?.toString() || booking.client?.toString();
        const vendorId = (booking.vendor as any)?._id?.toString() || booking.vendor?.toString();
        if (clientId) await notificationHelper.notifyBookingReminder(booking, clientId, 24);
        if (vendorId) await notificationHelper.notifyBookingReminder(booking, vendorId, 24);
        await Booking.findByIdAndUpdate(booking._id, { reminder24hSent: true });
      }

      for (const booking of bookings1h) {
        const clientId = (booking.client as any)?._id?.toString() || booking.client?.toString();
        const vendorId = (booking.vendor as any)?._id?.toString() || booking.vendor?.toString();
        if (clientId) await notificationHelper.notifyBookingReminder(booking, clientId, 1);
        if (vendorId) await notificationHelper.notifyBookingReminder(booking, vendorId, 1);
        await Booking.findByIdAndUpdate(booking._id, { reminder1hSent: true });
      }

      const total = bookings24h.length + bookings1h.length;
      if (total > 0) logger.info(`Booking reminders sent: ${bookings24h.length} (24h), ${bookings1h.length} (1h)`);
    } catch (error) {
      logger.error('Booking reminder cron error:', error);
    }
  });
};

/**
 * Remind clients to leave a review 24h after a booking is completed.
 * Runs daily at 10am.
 */
export const runReviewReminders = () => {
  cron.schedule('0 10 * * *', async () => {
    try {
      const now = new Date();
      const window24hStart = new Date(now.getTime() - 25 * 60 * 60 * 1000);
      const window24hEnd   = new Date(now.getTime() - 23 * 60 * 60 * 1000);

      const completedBookings = await Booking.find({
        status: BookingStatus.COMPLETED,
        updatedAt: { $gte: window24hStart, $lte: window24hEnd },
      }).populate('client vendor', 'firstName vendorProfile');

      for (const booking of completedBookings) {
        const clientId = (booking.client as any)?._id?.toString() || booking.client?.toString();
        const bookingId = booking._id.toString();
        const vendorName = (booking.vendor as any)?.vendorProfile?.businessName || 'your beauty pro';

        if (!clientId) continue;

        const alreadyReviewed = await Review.exists({ booking: booking._id, reviewer: clientId });
        if (alreadyReviewed) continue;

        await notificationHelper.notifyReviewReminder(clientId, bookingId, vendorName);
      }

      if (completedBookings.length > 0) {
        logger.info(`Review reminders sent for ${completedBookings.length} booking(s)`);
      }
    } catch (error) {
      logger.error('Review reminder cron error:', error);
    }
  });
};

/**
 * Nudge users with incomplete profiles.
 * - No avatar after 3 days (clients + vendors)
 * - No KYC submitted after 5 days of being a vendor
 * - No services added after 2 days of KYC approval
 * - No bookings after 7 days (clients only)
 * Runs daily at 9am.
 */
export const runIncompleteProfileReminders = () => {
  cron.schedule('0 9 * * *', async () => {
    try {
      const now = new Date();

      const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      // No avatar — 3 days after signup (send once, at the 3-day mark ±12h)
      const noAvatarUsers = await User.find({
        avatar: { $in: [null, '', undefined] },
        createdAt: { $gte: new Date(daysAgo(3).getTime() - 12 * 60 * 60 * 1000), $lte: new Date(daysAgo(3).getTime() + 12 * 60 * 60 * 1000) },
      }).select('_id');

      for (const user of noAvatarUsers) {
        await notificationHelper.notifyIncompleteProfile(user._id.toString(), 'avatar');
      }

      // No KYC submitted — 5 days after becoming a vendor
      const noKycVendors = await User.find({
        isVendor: true,
        'vendorProfile.kycStatus': { $in: [null, 'not_submitted', undefined] },
        'vendorProfile.createdAt': {
          $gte: new Date(daysAgo(5).getTime() - 12 * 60 * 60 * 1000),
          $lte: new Date(daysAgo(5).getTime() + 12 * 60 * 60 * 1000),
        },
      }).select('_id');

      for (const vendor of noKycVendors) {
        await notificationHelper.notifyIncompleteProfile(vendor._id.toString(), 'kyc');
      }

      // No services added — 2 days after KYC approved
      const noServiceVendors = await User.find({
        isVendor: true,
        'vendorProfile.kycStatus': 'approved',
        'vendorProfile.kycApprovedAt': {
          $gte: new Date(daysAgo(2).getTime() - 12 * 60 * 60 * 1000),
          $lte: new Date(daysAgo(2).getTime() + 12 * 60 * 60 * 1000),
        },
      }).select('_id vendorProfile');

      for (const vendor of noServiceVendors) {
        const serviceCount = (vendor as any).vendorProfile?.services?.length || 0;
        if (serviceCount === 0) {
          await notificationHelper.notifyIncompleteProfile(vendor._id.toString(), 'services');
        }
      }

      // No first booking — 7 days after signup (clients only)
      const noBookingClients = await User.find({
        isVendor: false,
        role: UserRole.CLIENT,
        createdAt: {
          $gte: new Date(daysAgo(7).getTime() - 12 * 60 * 60 * 1000),
          $lte: new Date(daysAgo(7).getTime() + 12 * 60 * 60 * 1000),
        },
      }).select('_id');

      for (const client of noBookingClients) {
        const hasBooked = await Booking.exists({ client: client._id });
        if (!hasBooked) {
          await notificationHelper.notifyIncompleteProfile(client._id.toString(), 'first_booking');
        }
      }

      logger.info('Incomplete profile reminders cron complete');
    } catch (error) {
      logger.error('Incomplete profile reminder cron error:', error);
    }
  });
};

/**
 * Notify clients when their offer is expiring in ~6 hours and when it expires.
 * Runs every 30 minutes.
 */
export const runOfferExpiryNotifications = () => {
  cron.schedule('*/30 * * * *', async () => {
    try {
      const now = new Date();

      // Expiring soon: expires in 5.5–6.5h, not yet notified
      const expiringSoonStart = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
      const expiringSoonEnd   = new Date(now.getTime() + 6.5 * 60 * 60 * 1000);

      const expiringSoon = await Offer.find({
        status: 'open',
        expiresAt: { $gte: expiringSoonStart, $lte: expiringSoonEnd },
        expiryWarningSent: { $ne: true },
      }).populate('client', '_id');

      for (const offer of expiringSoon) {
        const clientId = (offer.client as any)?._id?.toString() || offer.client?.toString();
        if (clientId) {
          await notificationHelper.notifyOfferExpiring(clientId, offer._id.toString(), (offer as any).title || 'your offer');
          await Offer.findByIdAndUpdate(offer._id, { expiryWarningSent: true });
        }
      }

      // Just expired: expired in the last 30 minutes, not yet notified
      const justExpiredStart = new Date(now.getTime() - 30 * 60 * 1000);
      const justExpired = await Offer.find({
        status: 'expired',
        expiresAt: { $gte: justExpiredStart, $lte: now },
        expiryNotifiedSent: { $ne: true },
      }).populate('client', '_id');

      for (const offer of justExpired) {
        const clientId = (offer.client as any)?._id?.toString() || offer.client?.toString();
        if (clientId) {
          await notificationHelper.notifyOfferExpired(clientId, offer._id.toString(), (offer as any).title || 'your offer');
          await Offer.findByIdAndUpdate(offer._id, { expiryNotifiedSent: true });
        }
      }

      const total = expiringSoon.length + justExpired.length;
      if (total > 0) logger.info(`Offer expiry: ${expiringSoon.length} expiring-soon, ${justExpired.length} just-expired`);
    } catch (error) {
      logger.error('Offer expiry cron error:', error);
    }
  });
};

/**
 * Re-engagement: notify users who haven't logged in for 14 or 30 days.
 * Also nudges clients with no recent booking and vendors with no recent booking received.
 * Runs daily at 11am.
 */
export const runReEngagementNotifications = () => {
  cron.schedule('0 11 * * *', async () => {
    try {
      const now = new Date();
      const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      // 14-day inactive — notify once at the 14-day mark (±12h window)
      const inactive14 = await User.find({
        lastSeen: {
          $gte: new Date(daysAgo(14).getTime() - 12 * 60 * 60 * 1000),
          $lte: new Date(daysAgo(14).getTime() + 12 * 60 * 60 * 1000),
        },
      }).select('_id isVendor role');

      for (const user of inactive14) {
        const role = user.isVendor ? 'vendor' : 'client';
        await notificationHelper.notifyReEngagement(user._id.toString(), role, 14);
      }

      // 30-day inactive — notify once at the 30-day mark (±12h window)
      const inactive30 = await User.find({
        lastSeen: {
          $gte: new Date(daysAgo(30).getTime() - 12 * 60 * 60 * 1000),
          $lte: new Date(daysAgo(30).getTime() + 12 * 60 * 60 * 1000),
        },
      }).select('_id isVendor');

      for (const user of inactive30) {
        const role = user.isVendor ? 'vendor' : 'client';
        await notificationHelper.notifyReEngagement(user._id.toString(), role, 30);
      }

      // Clients with no booking in 30 days
      const thirtyDaysAgo = daysAgo(30);
      const clientsWithNoBooking = await User.find({
        isVendor: false,
        role: UserRole.CLIENT,
        createdAt: { $lt: thirtyDaysAgo },
      }).select('_id');

      for (const client of clientsWithNoBooking) {
        const recentBooking = await Booking.exists({
          client: client._id,
          createdAt: { $gte: thirtyDaysAgo },
        });
        if (!recentBooking) {
          await notificationHelper.notifyNoBookingsClient(client._id.toString());
        }
      }

      // Vendors with no booking received in 14 days
      const fourteenDaysAgo = daysAgo(14);
      const activeVendors = await User.find({
        isVendor: true,
        'vendorProfile.kycStatus': 'approved',
        createdAt: { $lt: fourteenDaysAgo },
      }).select('_id');

      for (const vendor of activeVendors) {
        const recentBooking = await Booking.exists({
          vendor: vendor._id,
          createdAt: { $gte: fourteenDaysAgo },
        });
        if (!recentBooking) {
          await notificationHelper.notifyNoBookingsVendor(vendor._id.toString());
        }
      }

      logger.info('Re-engagement cron complete');
    } catch (error) {
      logger.error('Re-engagement cron error:', error);
    }
  });
};

/**
 * Subscription expiry alerts: warn vendors 3 days before plan expires, notify on expiry.
 * Runs daily at 8am.
 */
export const runSubscriptionExpiryAlerts = () => {
  cron.schedule('0 8 * * *', async () => {
    try {
      const now = new Date();
      const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const windowStart = new Date(in3days.getTime() - 12 * 60 * 60 * 1000);
      const windowEnd   = new Date(in3days.getTime() + 12 * 60 * 60 * 1000);

      // Expiring in ~3 days
      const expiringSoon = await User.find({
        isVendor: true,
        'vendorProfile.subscriptionExpiresAt': { $gte: windowStart, $lte: windowEnd },
        'vendorProfile.subscriptionStatus': 'active',
      }).select('_id vendorProfile');

      for (const vendor of expiringSoon) {
        const planName = (vendor as any).vendorProfile?.subscriptionPlan || 'current';
        await notificationHelper.notifyPlanExpiringSoon(vendor._id.toString(), planName, 3);
      }

      // Just expired (within last 24h)
      const justExpiredStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const justExpired = await User.find({
        isVendor: true,
        'vendorProfile.subscriptionExpiresAt': { $gte: justExpiredStart, $lte: now },
        'vendorProfile.subscriptionStatus': 'expired',
      }).select('_id vendorProfile');

      for (const vendor of justExpired) {
        const planName = (vendor as any).vendorProfile?.subscriptionPlan || 'current';
        await notificationHelper.notifyPlanExpired(vendor._id.toString(), planName);
      }

      logger.info(`Subscription alerts: ${expiringSoon.length} expiring-soon, ${justExpired.length} just-expired`);
    } catch (error) {
      logger.error('Subscription expiry cron error:', error);
    }
  });
};

/**
 * Release promo slots for abandoned Paystack checkouts.
 * Runs every 15 minutes. Finds card payments still PENDING after 30 minutes
 * that hold a promo redemption, and releases the slot back to the pool.
 */
export const runAbandonedPromoSlotCleanup = () => {
  cron.schedule('*/15 * * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 30 * 60 * 1000);
      const stale = await Payment.find({
        status: PaymentStatus.PENDING,
        paymentMethod: 'card',
        initiatedAt: { $lt: cutoff },
        'metadata.pendingBookingData.promoApplied': true,
      });

      let released = 0;
      for (const p of stale) {
        const pd = p.metadata?.pendingBookingData;
        if (pd?.promoCampaignId && pd?.promoRedemptionId) {
          await promoService.releaseSlot(pd.promoCampaignId, pd.promoRedemptionId);
          released++;
          // Blank out the promo pointers so we don't release twice on the next tick
          if (p.metadata?.pendingBookingData) {
            p.metadata.pendingBookingData.promoApplied = false;
            p.metadata.pendingBookingData.promoCampaignId = null;
            p.metadata.pendingBookingData.promoRedemptionId = null;
            p.markModified('metadata');
            await p.save();
          }
        }
      }

      if (released > 0) {
        logger.info(`Released ${released} abandoned promo slots`);
      }
    } catch (error) {
      logger.error('Abandoned promo slot cleanup cron error:', error);
    }
  });
};

export const startCronJobs = () => {
  checkInactiveUsers();
  runProximitySweep();
  runDropoutDetection();
  runBookingReminders();
  runReviewReminders();
  runIncompleteProfileReminders();
  runOfferExpiryNotifications();
  runReEngagementNotifications();
  runSubscriptionExpiryAlerts();
  runAbandonedPromoSlotCleanup();
  logger.info('Cron jobs started: inactive users, proximity sweep, dropout detection, booking reminders, review reminders, profile nudges, offer expiry, re-engagement, subscription alerts, abandoned promo cleanup');
};