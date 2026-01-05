"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.heartbeat = exports.updateUserActivity = void 0;
const User_1 = __importDefault(require("../models/User"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Middleware to update user activity on each request
 */
const updateUserActivity = async (req, _res, next) => {
    if (req.user?.id) {
        // Update in background, don't await to avoid slowing down requests
        User_1.default.findByIdAndUpdate(req.user.id, {
            isOnline: true,
            lastSeen: new Date(),
        }).catch((err) => {
            logger_1.default.error('Failed to update user activity:', err);
        });
    }
    next();
};
exports.updateUserActivity = updateUserActivity;
/**
 * Middleware to track user heartbeat (for real-time status)
 */
const heartbeat = async (req, _res, next) => {
    if (req.user?.id) {
        try {
            await User_1.default.findByIdAndUpdate(req.user.id, {
                isOnline: true,
                lastSeen: new Date(),
            });
        }
        catch (error) {
            logger_1.default.error('Heartbeat update failed:', error);
        }
    }
    next();
};
exports.heartbeat = heartbeat;
//# sourceMappingURL=activityTracker.js.map