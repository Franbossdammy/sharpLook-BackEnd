"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const call_service_1 = __importDefault(require("../services/call.service"));
const response_1 = __importDefault(require("../utils/response"));
class CallController {
    /**
     * Get call history
     */
    async getCallHistory(req, res, next) {
        try {
            const userId = req.user._id.toString();
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await call_service_1.default.getCallHistory(userId, page, limit);
            response_1.default.paginated(res, 'Call history retrieved successfully', result.calls, result.page, limit, result.total);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get call by ID
     */
    async getCall(req, res, next) {
        try {
            const userId = req.user._id.toString();
            const { callId } = req.params;
            const call = await call_service_1.default.getCallById(callId);
            // Verify user is participant
            if (call.caller.toString() !== userId &&
                call.receiver.toString() !== userId) {
                response_1.default.forbidden(res, 'Unauthorized to view this call');
                return;
            }
            response_1.default.success(res, 'Call retrieved successfully', call);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get active call
     */
    async getActiveCall(req, res, next) {
        try {
            const userId = req.user._id.toString();
            const call = await call_service_1.default.getActiveCall(userId);
            response_1.default.success(res, call ? 'Active call found' : 'No active call', { call });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Delete call from history
     */
    async deleteCall(req, res, next) {
        try {
            const userId = req.user._id.toString();
            const { callId } = req.params;
            await call_service_1.default.deleteCall(callId, userId);
            response_1.default.success(res, 'Call deleted successfully', null);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.default = new CallController();
//# sourceMappingURL=call.controller.js.map