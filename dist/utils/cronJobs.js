"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCronJobs = exports.checkInactiveUsers = void 0;
// utils/cronJobs.ts or services/backgroundJobs.ts
const node_cron_1 = __importDefault(require("node-cron"));
const User_1 = __importDefault(require("../models/User"));
const logger_1 = __importDefault(require("./logger"));
/**
 * Set users offline if they haven't been active for 5 minutes
 */
const checkInactiveUsers = () => {
    node_cron_1.default.schedule('*/2 * * * *', async () => {
        // Runs every 2 minutes
        try {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const result = await User_1.default.updateMany({
                isOnline: true,
                lastSeen: { $lt: fiveMinutesAgo },
            }, {
                $set: { isOnline: false },
            });
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
// Start the cron job
const startCronJobs = () => {
    (0, exports.checkInactiveUsers)();
    logger_1.default.info('Cron jobs started');
};
exports.startCronJobs = startCronJobs;
//# sourceMappingURL=cronJobs.js.map