// utils/cronJobs.ts or services/backgroundJobs.ts
import cron from 'node-cron';
import User from '../models/User';
import logger from './logger';

/**
 * Set users offline if they haven't been active for 5 minutes
 */
export const checkInactiveUsers = () => {
  cron.schedule('*/2 * * * *', async () => {
    // Runs every 2 minutes
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const result = await User.updateMany(
        {
          isOnline: true,
          lastSeen: { $lt: fiveMinutesAgo },
        },
        {
          $set: { isOnline: false },
        }
      );

      if (result.modifiedCount > 0) {
        logger.info(`Set ${result.modifiedCount} inactive users to offline`);
      }
    } catch (error) {
      logger.error('Error checking inactive users:', error);
    }
  });
};

// Start the cron job
export const startCronJobs = () => {
  checkInactiveUsers();
  logger.info('Cron jobs started');
};