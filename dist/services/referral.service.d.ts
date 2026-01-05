import { IReferral } from '../models/Referral';
declare class ReferralService {
    /**
     * Validate referral code (for real-time validation during registration)
     */
    validateReferralCode(referralCode: string): Promise<{
        valid: boolean;
        referrerName?: string;
        message?: string;
    }>;
    /**
     * Apply referral code during registration
     */
    applyReferralCode(userId: string, referralCode: string): Promise<IReferral>;
    /**
     * Process referral when first booking is completed
     */
    processReferralBooking(bookingId: string): Promise<void>;
    /**
     * Pay referral rewards
     */
    private payReferralRewards;
    /**
     * Get user's referral stats
     */
    /**
    * Get user's referral stats
    */
    getReferralStats(userId: string): Promise<any>;
    /**
     * Get user's referrals
     */
    getUserReferrals(userId: string, filters?: {
        status?: string;
    }, page?: number, limit?: number): Promise<{
        referrals: IReferral[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get referral by ID
     */
    getReferralById(referralId: string, userId: string): Promise<IReferral>;
    /**
     * Get referral leaderboard
     */
    getLeaderboard(limit?: number): Promise<Array<{
        user: any;
        referralCount: number;
        totalEarnings: number;
    }>>;
    /**
     * Expire old pending referrals
     */
    expireOldReferrals(): Promise<void>;
    /**
     * Admin: Get all referrals
     */
    getAllReferrals(filters?: {
        status?: string;
        startDate?: Date;
        endDate?: Date;
    }, page?: number, limit?: number): Promise<{
        referrals: IReferral[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Admin: Get referral statistics
     */
    getAdminStats(): Promise<any>;
}
declare const _default: ReferralService;
export default _default;
//# sourceMappingURL=referral.service.d.ts.map