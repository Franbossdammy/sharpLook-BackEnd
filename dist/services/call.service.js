"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Call_1 = __importDefault(require("../models/Call"));
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
class CallService {
    /**
     * Create a new call record
     */
    async createCall(callerId, receiverId, type) {
        try {
            const call = await Call_1.default.create({
                caller: callerId,
                receiver: receiverId,
                type,
                status: 'initiated',
            });
            await call.populate(['caller', 'receiver']);
            logger_1.default.info(`Call created: ${call._id} from ${callerId} to ${receiverId}`);
            return call;
        }
        catch (error) {
            logger_1.default.error('Error creating call:', error);
            throw error;
        }
    }
    /**
     * Update call status
     */
    async updateCallStatus(callId, status) {
        try {
            const call = await Call_1.default.findById(callId);
            if (!call) {
                throw new errors_1.NotFoundError('Call not found');
            }
            call.status = status;
            // Set timestamps based on status
            if (status === 'accepted' && !call.startedAt) {
                call.startedAt = new Date();
            }
            if (status === 'ended' || status === 'rejected' || status === 'missed' || status === 'cancelled') {
                call.endedAt = new Date();
                // Calculate duration if call was accepted
                if (call.startedAt && call.endedAt) {
                    call.duration = Math.floor((call.endedAt.getTime() - call.startedAt.getTime()) / 1000);
                }
            }
            await call.save();
            await call.populate(['caller', 'receiver']);
            logger_1.default.info(`Call ${callId} status updated to: ${status}`);
            return call;
        }
        catch (error) {
            logger_1.default.error('Error updating call status:', error);
            throw error;
        }
    }
    /**
     * Get call by ID
     */
    async getCallById(callId) {
        try {
            const call = await Call_1.default.findById(callId).populate(['caller', 'receiver']);
            if (!call) {
                throw new errors_1.NotFoundError('Call not found');
            }
            return call;
        }
        catch (error) {
            logger_1.default.error('Error getting call:', error);
            throw error;
        }
    }
    /**
     * Get call history for a user
     */
    async getCallHistory(userId, page = 1, limit = 20) {
        try {
            const skip = (page - 1) * limit;
            const calls = await Call_1.default.find({
                $or: [{ caller: userId }, { receiver: userId }],
            })
                .populate(['caller', 'receiver'])
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);
            const total = await Call_1.default.countDocuments({
                $or: [{ caller: userId }, { receiver: userId }],
            });
            return {
                calls,
                total,
                page,
            };
        }
        catch (error) {
            logger_1.default.error('Error getting call history:', error);
            throw error;
        }
    }
    /**
     * Get active call for user
     */
    async getActiveCall(userId) {
        try {
            const call = await Call_1.default.findOne({
                $or: [{ caller: userId }, { receiver: userId }],
                status: { $in: ['initiated', 'ringing', 'accepted'] },
            })
                .populate(['caller', 'receiver'])
                .sort({ createdAt: -1 });
            return call;
        }
        catch (error) {
            logger_1.default.error('Error getting active call:', error);
            throw error;
        }
    }
    /**
     * End call
     */
    async endCall(callId) {
        return this.updateCallStatus(callId, 'ended');
    }
    /**
     * Reject call
     */
    async rejectCall(callId) {
        return this.updateCallStatus(callId, 'rejected');
    }
    /**
     * Mark call as missed
     */
    async markCallAsMissed(callId) {
        return this.updateCallStatus(callId, 'missed');
    }
    /**
     * Cancel call
     */
    async cancelCall(callId) {
        return this.updateCallStatus(callId, 'cancelled');
    }
    /**
     * Delete call from history
     */
    async deleteCall(callId, userId) {
        try {
            const call = await Call_1.default.findById(callId);
            if (!call) {
                throw new errors_1.NotFoundError('Call not found');
            }
            // Only allow caller or receiver to delete
            if (call.caller.toString() !== userId &&
                call.receiver.toString() !== userId) {
                throw new errors_1.BadRequestError('Unauthorized to delete this call');
            }
            await Call_1.default.findByIdAndDelete(callId);
            logger_1.default.info(`Call ${callId} deleted by ${userId}`);
        }
        catch (error) {
            logger_1.default.error('Error deleting call:', error);
            throw error;
        }
    }
}
exports.default = new CallService();
//# sourceMappingURL=call.service.js.map