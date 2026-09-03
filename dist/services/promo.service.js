"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const PromoCampaign_1 = __importDefault(require("../models/PromoCampaign"));
const logger_1 = __importDefault(require("../utils/logger"));
class PromoService {
    /**
     * Return the currently active promo campaign, or null.
     * "Active" = isActive true, within date window (if set), and has slots remaining.
     */
    async getActivePromo() {
        const now = new Date();
        return PromoCampaign_1.default.findOne({
            isActive: true,
            slotsRemaining: { $gt: 0 },
            $and: [
                { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
                { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }] },
            ],
        });
    }
    /**
     * Non-mutating eligibility check. Use to decide whether to show the promo
     * banner to a user on the booking screen.
     */
    async checkEligibility(userId, servicePrice, bookingType) {
        const campaign = await this.getActivePromo();
        if (!campaign) {
            return { eligible: false, reason: 'NO_ACTIVE_PROMO' };
        }
        if (servicePrice < campaign.minServicePrice) {
            return {
                eligible: false,
                reason: 'SERVICE_PRICE_TOO_LOW',
                campaign,
                discountAmount: campaign.discountAmount,
                vendorBonusAmount: campaign.vendorBonusAmount,
            };
        }
        if (campaign.appliesTo === 'HOME_SERVICE' &&
            bookingType !== 'HOME_SERVICE') {
            return { eligible: false, reason: 'BOOKING_TYPE_NOT_ELIGIBLE', campaign };
        }
        if (campaign.appliesTo === 'IN_SHOP' && bookingType !== 'IN_SHOP') {
            return { eligible: false, reason: 'BOOKING_TYPE_NOT_ELIGIBLE', campaign };
        }
        const userIdObj = new mongoose_1.default.Types.ObjectId(userId);
        const userRedemptions = campaign.redemptions.filter((r) => r.user.toString() === userIdObj.toString()).length;
        if (userRedemptions >= campaign.maxUsesPerUser) {
            return { eligible: false, reason: 'USER_ALREADY_REDEEMED', campaign };
        }
        return {
            eligible: true,
            campaign,
            discountAmount: campaign.discountAmount,
            vendorBonusAmount: campaign.vendorBonusAmount,
        };
    }
    /**
     * Atomically reserve a slot for this user + booking.
     * Race-safe: uses findOneAndUpdate with $inc + slotsRemaining>0 + per-user cap.
     * If the atomic condition fails, returns { success: false }.
     */
    async claimSlot(userId, bookingId, servicePrice, bookingType) {
        const now = new Date();
        const userIdObj = new mongoose_1.default.Types.ObjectId(userId);
        const bookingIdObj = new mongoose_1.default.Types.ObjectId(bookingId);
        const active = await this.getActivePromo();
        if (!active) {
            return { success: false, reason: 'NO_ACTIVE_PROMO' };
        }
        if (servicePrice < active.minServicePrice) {
            return { success: false, reason: 'NO_ACTIVE_PROMO' };
        }
        if (active.appliesTo === 'HOME_SERVICE' && bookingType !== 'HOME_SERVICE') {
            return { success: false, reason: 'NO_ACTIVE_PROMO' };
        }
        if (active.appliesTo === 'IN_SHOP' && bookingType !== 'IN_SHOP') {
            return { success: false, reason: 'NO_ACTIVE_PROMO' };
        }
        const redemptionId = new mongoose_1.default.Types.ObjectId();
        const claimed = await PromoCampaign_1.default.findOneAndUpdate({
            _id: active._id,
            isActive: true,
            slotsRemaining: { $gt: 0 },
            $and: [
                {
                    $or: [
                        { startsAt: { $exists: false } },
                        { startsAt: null },
                        { startsAt: { $lte: now } },
                    ],
                },
                {
                    $or: [
                        { endsAt: { $exists: false } },
                        { endsAt: null },
                        { endsAt: { $gte: now } },
                    ],
                },
            ],
            $expr: {
                $lt: [
                    {
                        $size: {
                            $filter: {
                                input: '$redemptions',
                                as: 'r',
                                cond: { $eq: ['$$r.user', userIdObj] },
                            },
                        },
                    },
                    '$maxUsesPerUser',
                ],
            },
        }, {
            $inc: { slotsRemaining: -1 },
            $push: {
                redemptions: {
                    _id: redemptionId,
                    user: userIdObj,
                    booking: bookingIdObj,
                    redeemedAt: now,
                },
            },
        }, { new: true });
        if (!claimed) {
            const stillActive = await PromoCampaign_1.default.findById(active._id);
            if (!stillActive || stillActive.slotsRemaining === 0) {
                return { success: false, reason: 'SLOTS_EXHAUSTED' };
            }
            return { success: false, reason: 'USER_ALREADY_REDEEMED' };
        }
        logger_1.default.info(`Promo slot claimed: campaign=${claimed._id} user=${userId} booking=${bookingId} remaining=${claimed.slotsRemaining}`);
        return {
            success: true,
            campaign: claimed,
            redemptionId,
            discountAmount: claimed.discountAmount,
            vendorBonusAmount: claimed.vendorBonusAmount,
        };
    }
    /**
     * Release a slot back to the pool. Called on booking cancellation / refund.
     * Marks the redemption record with refundedAt but keeps it (per-user lifetime
     * cap still counts refunded redemptions).
     */
    async releaseSlot(campaignId, redemptionId) {
        const now = new Date();
        const updated = await PromoCampaign_1.default.findOneAndUpdate({
            _id: campaignId,
            redemptions: {
                $elemMatch: { _id: redemptionId, refundedAt: { $exists: false } },
            },
        }, {
            $inc: { slotsRemaining: 1 },
            $set: { 'redemptions.$[r].refundedAt': now },
        }, {
            new: true,
            arrayFilters: [{ 'r._id': redemptionId, 'r.refundedAt': { $exists: false } }],
        });
        if (updated) {
            logger_1.default.info(`Promo slot released: campaign=${campaignId} redemption=${redemptionId} remaining=${updated.slotsRemaining}`);
        }
    }
}
const promoService = new PromoService();
exports.default = promoService;
//# sourceMappingURL=promo.service.js.map