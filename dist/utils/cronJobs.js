"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCronJobs = exports.runDropoutDetection = exports.runProximitySweep = exports.checkInactiveUsers = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const User_1 = __importDefault(require("../models/User"));
const logger_1 = __importDefault(require("./logger"));
const redFlag_service_1 = __importDefault(require("../services/redFlag.service"));
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
const startCronJobs = () => {
    (0, exports.checkInactiveUsers)();
    (0, exports.runProximitySweep)();
    (0, exports.runDropoutDetection)();
    logger_1.default.info('Cron jobs started: inactive users, proximity sweep, dropout detection');
};
exports.startCronJobs = startCronJobs;
//# sourceMappingURL=cronJobs.js.map