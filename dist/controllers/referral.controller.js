"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const referral_service_1 = __importDefault(require("../services/referral.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
class ReferralController {
    constructor() {
        // Add this method to your ReferralController class (referral.controller.ts)
        this.validateReferralCode = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { referralCode } = req.body;
            if (!referralCode) {
                return response_1.default.badRequest(res, 'Referral code is required');
            }
            const result = await referral_service_1.default.validateReferralCode(referralCode);
            return response_1.default.success(res, 'Referral code validated', result);
        });
        this.applyReferralCode = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const { referralCode } = req.body;
            const referral = await referral_service_1.default.applyReferralCode(userId, referralCode);
            return response_1.default.created(res, 'Referral code applied successfully', { referral });
        });
        this.getReferralStats = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const stats = await referral_service_1.default.getReferralStats(userId);
            return response_1.default.success(res, 'Referral stats retrieved', { stats });
        });
        this.getUserReferrals = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = {
                status: req.query.status,
            };
            const result = await referral_service_1.default.getUserReferrals(userId, filters, page, limit);
            return response_1.default.paginated(res, 'Referrals retrieved', result.referrals, page, limit, result.total);
        });
        this.getReferralById = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { referralId } = req.params;
            const userId = req.user.id;
            const referral = await referral_service_1.default.getReferralById(referralId, userId);
            return response_1.default.success(res, 'Referral retrieved', { referral });
        });
        this.getLeaderboard = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const limit = parseInt(req.query.limit) || 10;
            const leaderboard = await referral_service_1.default.getLeaderboard(limit);
            return response_1.default.success(res, 'Leaderboard retrieved', { leaderboard });
        });
        // Admin endpoints
        this.getAllReferrals = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = {
                status: req.query.status,
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
            };
            const result = await referral_service_1.default.getAllReferrals(filters, page, limit);
            return response_1.default.paginated(res, 'Referrals retrieved', result.referrals, page, limit, result.total);
        });
        this.getAdminStats = (0, error_1.asyncHandler)(async (_req, res, _next) => {
            const stats = await referral_service_1.default.getAdminStats();
            return response_1.default.success(res, 'Referral statistics retrieved', { stats });
        });
    }
}
exports.default = new ReferralController();
//# sourceMappingURL=referral.controller.js.map