"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCronJobs = exports.runBookingReminders = exports.runDropoutDetection = exports.runProximitySweep = exports.checkInactiveUsers = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const User_1 = __importDefault(require("../models/User"));
const Booking_1 = __importDefault(require("../models/Booking"));
const logger_1 = __importDefault(require("./logger"));
const redFlag_service_1 = __importDefault(require("../services/redFlag.service"));
const notificationHelper_1 = __importDefault(require("./notificationHelper"));
const types_1 = require("../types");
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
const startCronJobs = () => {
    (0, exports.checkInactiveUsers)();
    (0, exports.runProximitySweep)();
    (0, exports.runDropoutDetection)();
    (0, exports.runBookingReminders)();
    logger_1.default.info('Cron jobs started: inactive users, proximity sweep, dropout detection, booking reminders');
};
exports.startCronJobs = startCronJobs;
//# sourceMappingURL=cronJobs.js.map