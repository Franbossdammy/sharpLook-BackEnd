import mongoose from 'mongoose';
import { IPromoCampaign } from '../models/PromoCampaign';
export type PromoAppliesTo = 'ALL' | 'HOME_SERVICE' | 'IN_SHOP';
export interface EligibilityResult {
    eligible: boolean;
    reason?: 'NO_ACTIVE_PROMO' | 'SERVICE_PRICE_TOO_LOW' | 'BOOKING_TYPE_NOT_ELIGIBLE' | 'USER_ALREADY_REDEEMED' | 'SLOTS_EXHAUSTED' | 'CAMPAIGN_NOT_STARTED' | 'CAMPAIGN_ENDED';
    campaign?: IPromoCampaign;
    discountAmount?: number;
    vendorBonusAmount?: number;
}
export interface ClaimResult {
    success: boolean;
    reason?: 'SLOTS_EXHAUSTED' | 'USER_ALREADY_REDEEMED' | 'NO_ACTIVE_PROMO';
    campaign?: IPromoCampaign;
    redemptionId?: mongoose.Types.ObjectId;
    discountAmount?: number;
    vendorBonusAmount?: number;
}
declare class PromoService {
    /**
     * Return the currently active promo campaign, or null.
     * "Active" = isActive true, within date window (if set), and has slots remaining.
     */
    getActivePromo(): Promise<IPromoCampaign | null>;
    /**
     * Non-mutating eligibility check. Use to decide whether to show the promo
     * banner to a user on the booking screen.
     */
    checkEligibility(userId: string, servicePrice: number, bookingType: PromoAppliesTo | 'STANDARD' | 'OFFER' | string): Promise<EligibilityResult>;
    /**
     * Atomically reserve a slot for this user + booking.
     * Race-safe: uses findOneAndUpdate with $inc + slotsRemaining>0 + per-user cap.
     * If the atomic condition fails, returns { success: false }.
     */
    claimSlot(userId: string, bookingId: string, servicePrice: number, bookingType: string): Promise<ClaimResult>;
    /**
     * Release a slot back to the pool. Called on booking cancellation / refund.
     * Marks the redemption record with refundedAt but keeps it (per-user lifetime
     * cap still counts refunded redemptions).
     */
    releaseSlot(campaignId: string | mongoose.Types.ObjectId, redemptionId: string | mongoose.Types.ObjectId): Promise<void>;
}
declare const promoService: PromoService;
export default promoService;
//# sourceMappingURL=promo.service.d.ts.map