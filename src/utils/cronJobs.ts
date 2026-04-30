import cron from 'node-cron';
import User from '../models/User';
import logger from './logger';
import redFlagService from '../services/redFlag.service';

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

export const startCronJobs = () => {
  checkInactiveUsers();
  runProximitySweep();
  runDropoutDetection();
  logger.info('Cron jobs started: inactive users, proximity sweep, dropout detection');
};