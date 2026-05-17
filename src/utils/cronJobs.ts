import cron from 'node-cron';
import User from '../models/User';
import Booking from '../models/Booking';
import logger from './logger';
import redFlagService from '../services/redFlag.service';
import notificationHelper from './notificationHelper';
import { BookingStatus } from '../types';

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

export const startCronJobs = () => {
  checkInactiveUsers();
  runProximitySweep();
  runDropoutDetection();
  runBookingReminders();
  logger.info('Cron jobs started: inactive users, proximity sweep, dropout detection, booking reminders');
};