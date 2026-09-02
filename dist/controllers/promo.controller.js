"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const PromoCampaign_1 = __importDefault(require("../models/PromoCampaign"));
const promo_service_1 = __importDefault(require("../services/promo.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
const errors_1 = require("../utils/errors");
class PromoController {
    constructor() {
        /**
         * Get the currently active promo campaign, plus (if authenticated) whether
         * the requesting user is still eligible to redeem.
         * @route  GET /api/v1/promo/current
         * @access Public (auth optional)
         */
        this.getCurrent = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const campaign = await promo_service_1.default.getActivePromo();
            if (!campaign) {
                return response_1.default.success(res, 'No active promo', { active: null });
            }
            let userEligible = false;
            let userAlreadyRedeemed = false;
            if (req.user?.id) {
                const userIdStr = req.user.id.toString();
                const userRedemptions = campaign.redemptions.filter((r) => r.user.toString() === userIdStr).length;
                userAlreadyRedeemed = userRedemptions >= campaign.maxUsesPerUser;
                userEligible = !userAlreadyRedeemed && campaign.slotsRemaining > 0;
            }
            return response_1.default.success(res, 'Active promo', {
                active: {
                    id: campaign._id,
                    name: campaign.name,
                    description: campaign.description || null,
                    discountAmount: campaign.discountAmount,
                    vendorBonusAmount: campaign.vendorBonusAmount,
                    minServicePrice: campaign.minServicePrice,
                    maxSlots: campaign.maxSlots,
                    slotsRemaining: campaign.slotsRemaining,
                    appliesTo: campaign.appliesTo,
                    endsAt: campaign.endsAt || null,
                },
                userEligible,
                userAlreadyRedeemed,
            });
        });
        /**
         * Create a new promo campaign
         * @route  POST /api/v1/admin/promo
         * @access Admin
         */
        this.createCampaign = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { name, description, discountAmount, vendorBonusAmount, minServicePrice, maxSlots, maxUsesPerUser, appliesTo, startsAt, endsAt, isActive, } = req.body;
            if (!name)
                throw new errors_1.BadRequestError('Name is required');
            if (typeof discountAmount !== 'number' || discountAmount < 0) {
                throw new errors_1.BadRequestError('discountAmount must be a non-negative number');
            }
            if (typeof vendorBonusAmount !== 'number' || vendorBonusAmount < 0) {
                throw new errors_1.BadRequestError('vendorBonusAmount must be a non-negative number');
            }
            if (typeof minServicePrice !== 'number' || minServicePrice < 0) {
                throw new errors_1.BadRequestError('minServicePrice must be a non-negative number');
            }
            if (typeof maxSlots !== 'number' || maxSlots < 1) {
                throw new errors_1.BadRequestError('maxSlots must be at least 1');
            }
            const campaign = await PromoCampaign_1.default.create({
                name,
                description,
                discountAmount,
                vendorBonusAmount,
                minServicePrice,
                maxSlots,
                slotsRemaining: maxSlots,
                maxUsesPerUser: maxUsesPerUser ?? 1,
                appliesTo: appliesTo || 'ALL',
                startsAt,
                endsAt,
                isActive: isActive !== undefined ? !!isActive : true,
                redemptions: [],
            });
            return response_1.default.success(res, 'Promo campaign created', campaign);
        });
        /**
         * Toggle campaign active state
         * @route  PATCH /api/v1/admin/promo/:id/pause
         * @access Admin
         */
        this.togglePause = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { id } = req.params;
            const { isActive } = req.body;
            const campaign = await PromoCampaign_1.default.findById(id);
            if (!campaign)
                throw new errors_1.NotFoundError('Promo campaign not found');
            campaign.isActive = typeof isActive === 'boolean' ? isActive : !campaign.isActive;
            await campaign.save();
            return response_1.default.success(res, campaign.isActive ? 'Promo resumed' : 'Promo paused', campaign);
        });
        /**
         * Update campaign settings. Cannot decrease maxSlots below already-redeemed count.
         * @route  PATCH /api/v1/admin/promo/:id
         * @access Admin
         */
        this.updateCampaign = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { id } = req.params;
            const campaign = await PromoCampaign_1.default.findById(id);
            if (!campaign)
                throw new errors_1.NotFoundError('Promo campaign not found');
            const { name, description, discountAmount, vendorBonusAmount, minServicePrice, maxSlots, maxUsesPerUser, appliesTo, startsAt, endsAt, } = req.body;
            if (name !== undefined)
                campaign.name = name;
            if (description !== undefined)
                campaign.description = description;
            if (discountAmount !== undefined)
                campaign.discountAmount = discountAmount;
            if (vendorBonusAmount !== undefined)
                campaign.vendorBonusAmount = vendorBonusAmount;
            if (minServicePrice !== undefined)
                campaign.minServicePrice = minServicePrice;
            if (maxUsesPerUser !== undefined)
                campaign.maxUsesPerUser = maxUsesPerUser;
            if (appliesTo !== undefined)
                campaign.appliesTo = appliesTo;
            if (startsAt !== undefined)
                campaign.startsAt = startsAt;
            if (endsAt !== undefined)
                campaign.endsAt = endsAt;
            if (maxSlots !== undefined) {
                const alreadyClaimed = campaign.maxSlots - campaign.slotsRemaining;
                if (maxSlots < alreadyClaimed) {
                    throw new errors_1.BadRequestError(`Cannot reduce maxSlots below ${alreadyClaimed} (already claimed)`);
                }
                campaign.slotsRemaining += maxSlots - campaign.maxSlots;
                campaign.maxSlots = maxSlots;
            }
            await campaign.save();
            return response_1.default.success(res, 'Promo campaign updated', campaign);
        });
        /**
         * Clear all refunded redemptions from a campaign. Intended for testing so a
         * user isn't permanently blocked after an abandoned Paystack checkout or a
         * refund during a test run. In production, refunded redemptions still count
         * against the per-user cap by design — use with care.
         * @route  POST /api/v1/promo/admin/:id/clear-refunded
         * @access Admin
         */
        this.clearRefunded = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { id } = req.params;
            const campaign = await PromoCampaign_1.default.findById(id);
            if (!campaign)
                throw new errors_1.NotFoundError('Promo campaign not found');
            const before = campaign.redemptions.length;
            const removed = campaign.redemptions.filter((r) => r.refundedAt).length;
            campaign.redemptions = campaign.redemptions.filter((r) => !r.refundedAt);
            await campaign.save();
            return response_1.default.success(res, 'Refunded redemptions cleared', {
                campaignId: campaign._id,
                removed,
                redemptionsBefore: before,
                redemptionsAfter: campaign.redemptions.length,
                slotsRemaining: campaign.slotsRemaining,
                maxSlots: campaign.maxSlots,
            });
        });
        /**
         * List all campaigns (admin)
         * @route  GET /api/v1/admin/promo
         * @access Admin
         */
        this.listCampaigns = (0, error_1.asyncHandler)(async (_req, res, _next) => {
            const campaigns = await PromoCampaign_1.default.find()
                .select('-redemptions')
                .sort({ createdAt: -1 });
            return response_1.default.success(res, 'Promo campaigns', campaigns);
        });
        /**
         * Get campaign stats
         * @route  GET /api/v1/admin/promo/:id/stats
         * @access Admin
         */
        this.getStats = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { id } = req.params;
            const campaign = await PromoCampaign_1.default.findById(id)
                .populate('redemptions.user', 'firstName lastName email')
                .populate('redemptions.booking', 'servicePrice totalAmount vendor status');
            if (!campaign)
                throw new errors_1.NotFoundError('Promo campaign not found');
            const activeRedemptions = campaign.redemptions.filter((r) => !r.refundedAt);
            const refundedRedemptions = campaign.redemptions.filter((r) => r.refundedAt);
            const slotsUsed = campaign.maxSlots - campaign.slotsRemaining;
            const totalClientDiscount = activeRedemptions.length * campaign.discountAmount;
            const totalVendorBonusCommitted = activeRedemptions.length * campaign.vendorBonusAmount;
            return response_1.default.success(res, 'Promo stats', {
                campaign: {
                    id: campaign._id,
                    name: campaign.name,
                    isActive: campaign.isActive,
                    maxSlots: campaign.maxSlots,
                    slotsRemaining: campaign.slotsRemaining,
                    slotsUsed,
                    discountAmount: campaign.discountAmount,
                    vendorBonusAmount: campaign.vendorBonusAmount,
                    minServicePrice: campaign.minServicePrice,
                },
                stats: {
                    totalRedemptions: campaign.redemptions.length,
                    activeRedemptions: activeRedemptions.length,
                    refundedRedemptions: refundedRedemptions.length,
                    totalClientDiscount,
                    totalVendorBonusCommitted,
                    totalPlatformSpend: totalClientDiscount + totalVendorBonusCommitted,
                },
                redemptions: campaign.redemptions,
            });
        });
    }
}
exports.default = new PromoController();
//# sourceMappingURL=promo.controller.js.map