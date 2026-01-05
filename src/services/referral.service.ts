import Referral, { IReferral } from '../models/Referral';
import User from '../models/User';
import Transaction from '../models/Transaction';
import Booking from '../models/Booking';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { parsePaginationParams, generateRandomString } from '../utils/helpers';
import { TransactionType, PaymentStatus } from '../types';
import logger from '../utils/logger';

class ReferralService {
  /**
   * Validate referral code (for real-time validation during registration)
   */
  public async validateReferralCode(referralCode: string): Promise<{
    valid: boolean;
    referrerName?: string;
    message?: string;
  }> {
    try {
      // Find user with this referral code
      const referrer = await User.findOne({ referralCode }).select('firstName lastName');
      
      if (!referrer) {
        return {
          valid: false,
          message: 'Invalid referral code',
        };
      }

      return {
        valid: true,
        referrerName: `${referrer.firstName} ${referrer.lastName}`,
      };
    } catch (error) {
      logger.error('Error validating referral code:', error);
      return {
        valid: false,
        message: 'Error validating referral code',
      };
    }
  }

  /**
   * Apply referral code during registration
   */
  public async applyReferralCode(userId: string, referralCode: string): Promise<IReferral> {
    console.log('🔧 applyReferralCode called with:', { userId, referralCode });
    
    // Find user with this referral code
    const referrer = await User.findOne({ referralCode });
    console.log('🔍 Referrer lookup result:', referrer ? 'Found' : 'Not found');
    
    if (!referrer) {
      console.log('❌ Invalid referral code:', referralCode);
      throw new NotFoundError('Invalid referral code');
    }

    console.log('✅ Referrer found:', {
      id: referrer._id.toString(),
      name: `${referrer.firstName} ${referrer.lastName}`,
      email: referrer.email,
    });

    // Check if user is trying to refer themselves
    if (referrer._id.toString() === userId) {
      console.log('❌ Self-referral attempt detected');
      throw new BadRequestError('You cannot refer yourself');
    }

    // Check if user already used a referral code
    const existingReferral = await Referral.findOne({ referee: userId });
    console.log('🔍 Existing referral check:', existingReferral ? 'Found' : 'Not found');
    
    if (existingReferral) {
      console.log('❌ User already has a referral:', existingReferral._id.toString());
      throw new BadRequestError('You have already used a referral code');
    }

    // Create referral record
    console.log('📝 Creating referral record...');
    const referral = await Referral.create({
      referrer: referrer._id,
      referee: userId,
      referralCode,
      status: 'pending',
      requiresFirstBooking: true,
      firstBookingCompleted: false,
    });

    console.log('✅ Referral record created:', {
      id: referral._id.toString(),
      status: referral.status,
      referrer: referral.referrer.toString(),
      referee: referral.referee.toString(),
      referralCode: referral.referralCode,
      requiresFirstBooking: referral.requiresFirstBooking,
    });

    // Update user's referredBy field
    console.log('📝 Updating user referredBy field...');
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { referredBy: referrer._id },
      { new: true }
    );
    console.log('✅ User updated, referredBy:', updatedUser?.referredBy?.toString());

    logger.info(`Referral applied: ${userId} referred by ${referrer._id}`);

    return referral;
  }

  /**
   * Process referral when first booking is completed
   */
  public async processReferralBooking(bookingId: string): Promise<void> {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      console.log('⚠️ Booking not found:', bookingId);
      return;
    }

    console.log('🔍 Checking for referral for client:', booking.client.toString());

    // Find pending referral for this user
    const referral = await Referral.findOne({
      referee: booking.client,
      status: 'pending',
      requiresFirstBooking: true,
      firstBookingCompleted: false,
    });

    if (!referral) {
      console.log('ℹ️ No pending referral found for this booking');
      return;
    }

    console.log('✅ Found pending referral:', referral._id.toString());

    // Update referral
    referral.firstBookingCompleted = true;
    referral.firstBookingId = booking._id;
    referral.status = 'completed';
    referral.completedAt = new Date();
    await referral.save();

    console.log('✅ Referral marked as completed');

    // Pay rewards
    await this.payReferralRewards(referral._id.toString());

    logger.info(`Referral completed: ${referral._id} from booking ${bookingId}`);
  }

  /**
   * Pay referral rewards
   */
  private async payReferralRewards(referralId: string): Promise<void> {
    const referral = await Referral.findById(referralId);
    if (!referral) {
      console.log('⚠️ Referral not found:', referralId);
      return;
    }

    console.log('💰 Processing referral rewards for:', referralId);

    // Pay referrer
    if (!referral.referrerPaid) {
      console.log('💵 Paying referrer...');
      const referrer = await User.findById(referral.referrer);
      if (referrer) {
        const previousBalance = referrer.walletBalance || 0;
        referrer.walletBalance = previousBalance + referral.referrerReward;
        await referrer.save();

        // Create transaction
        const transaction = await Transaction.create({
          user: referrer._id,
          type: TransactionType.REFERRAL_BONUS,
          amount: referral.referrerReward,
          balanceBefore: previousBalance,
          balanceAfter: referrer.walletBalance,
          status: PaymentStatus.COMPLETED,
          reference: `REF-${Date.now()}-${generateRandomString(8)}`,
          description: `Referral bonus for inviting a friend`,
        });

        referral.referrerPaid = true;
        referral.referrerPaidAt = new Date();
        referral.referrerPaymentId = transaction._id;

        console.log('✅ Referrer paid:', {
          userId: referrer._id.toString(),
          amount: referral.referrerReward,
          newBalance: referrer.walletBalance,
        });
      }
    }

    // Pay referee
    if (!referral.refereePaid) {
      console.log('💵 Paying referee...');
      const referee = await User.findById(referral.referee);
      if (referee) {
        const previousBalance = referee.walletBalance || 0;
        referee.walletBalance = previousBalance + referral.refereeReward;
        await referee.save();

        // Create transaction
        const transaction = await Transaction.create({
          user: referee._id,
          type: TransactionType.REFERRAL_BONUS,
          amount: referral.refereeReward,
          balanceBefore: previousBalance,
          balanceAfter: referee.walletBalance,
          status: PaymentStatus.COMPLETED,
          reference: `REF-${Date.now()}-${generateRandomString(8)}`,
          description: `Welcome bonus for joining with referral code`,
        });

        referral.refereePaid = true;
        referral.refereePaidAt = new Date();
        referral.refereePaymentId = transaction._id;

        console.log('✅ Referee paid:', {
          userId: referee._id.toString(),
          amount: referral.refereeReward,
          newBalance: referee.walletBalance,
        });
      }
    }

    await referral.save();

    logger.info(`Referral rewards paid: ${referralId}`);
  }

  /**
   * Get user's referral stats
   */
 /**
 * Get user's referral stats
 */
public async getReferralStats(userId: string): Promise<any> {
  const [totalReferrals, completedReferrals, pendingReferrals, paidReferrals] =
    await Promise.all([
      Referral.countDocuments({ referrer: userId }),
      Referral.countDocuments({ referrer: userId, status: 'completed' }),
      Referral.countDocuments({ referrer: userId, status: 'pending' }),
      // ⭐ FIX: Use find instead of aggregate for better type handling
      Referral.find({ 
        referrer: userId, 
        referrerPaid: true 
      }).select('referrerReward'),
    ]);

  // Calculate total earnings manually
  const totalEarnings = paidReferrals.reduce((sum, ref) => sum + ref.referrerReward, 0);

  return {
    totalReferrals,
    completedReferrals,
    pendingReferrals,
    totalEarnings,
  };
}
  /**
   * Get user's referrals
   */
  public async getUserReferrals(
    userId: string,
    filters?: {
      status?: string;
    },
    page: number = 1,
    limit: number = 20
  ): Promise<{ referrals: IReferral[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    const query: any = { referrer: userId };

    if (filters?.status) {
      query.status = filters.status;
    }

    const [referrals, total] = await Promise.all([
      Referral.find(query)
        .populate('referee', 'firstName lastName email avatar createdAt')
        .populate('firstBookingId', 'service scheduledDate totalAmount')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Referral.countDocuments(query),
    ]);

    return {
      referrals,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get referral by ID
   */
  public async getReferralById(referralId: string, userId: string): Promise<IReferral> {
    const referral = await Referral.findById(referralId)
      .populate('referrer', 'firstName lastName email avatar')
      .populate('referee', 'firstName lastName email avatar')
      .populate('firstBookingId', 'service scheduledDate totalAmount status');

    if (!referral) {
      throw new NotFoundError('Referral not found');
    }

    // Verify ownership
    if (
      referral.referrer._id.toString() !== userId &&
      referral.referee._id.toString() !== userId
    ) {
      throw new BadRequestError('Not authorized to view this referral');
    }

    return referral;
  }

  /**
   * Get referral leaderboard
   */
  public async getLeaderboard(
    limit: number = 10
  ): Promise<
    Array<{
      user: any;
      referralCount: number;
      totalEarnings: number;
    }>
  > {
    const leaderboard = await Referral.aggregate([
      {
        $match: {
          status: 'completed',
          referrerPaid: true,
        },
      },
      {
        $group: {
          _id: '$referrer',
          referralCount: { $sum: 1 },
          totalEarnings: { $sum: '$referrerReward' },
        },
      },
      { $sort: { referralCount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          user: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            avatar: 1,
          },
          referralCount: 1,
          totalEarnings: 1,
        },
      },
    ]);

    return leaderboard;
  }

  /**
   * Expire old pending referrals
   */
  public async expireOldReferrals(): Promise<void> {
    const result = await Referral.updateMany(
      {
        status: 'pending',
        expiresAt: { $lt: new Date() },
      },
      {
        status: 'expired',
      }
    );

    if (result.modifiedCount > 0) {
      logger.info(`Expired ${result.modifiedCount} old referrals`);
    }
  }

  /**
   * Admin: Get all referrals
   */
  public async getAllReferrals(
    filters?: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 20
  ): Promise<{ referrals: IReferral[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    const query: any = {};

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.createdAt.$lte = filters.endDate;
      }
    }

    const [referrals, total] = await Promise.all([
      Referral.find(query)
        .populate('referrer', 'firstName lastName email')
        .populate('referee', 'firstName lastName email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Referral.countDocuments(query),
    ]);

    return {
      referrals,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin: Get referral statistics
   */
  public async getAdminStats(): Promise<any> {
    const [
      totalReferrals,
      completedReferrals,
      pendingReferrals,
      totalRewardsPaid,
      avgRewardPerReferral,
    ] = await Promise.all([
      Referral.countDocuments(),
      Referral.countDocuments({ status: 'completed' }),
      Referral.countDocuments({ status: 'pending' }),
      Referral.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: null,
            total: { $sum: { $add: ['$referrerReward', '$refereeReward'] } },
          },
        },
      ]),
      Referral.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: null,
            avg: { $avg: { $add: ['$referrerReward', '$refereeReward'] } },
          },
        },
      ]),
    ]);

    return {
      totalReferrals,
      completedReferrals,
      pendingReferrals,
      conversionRate:
        totalReferrals > 0 ? ((completedReferrals / totalReferrals) * 100).toFixed(2) : 0,
      totalRewardsPaid: totalRewardsPaid[0]?.total || 0,
      avgRewardPerReferral: avgRewardPerReferral[0]?.avg || 0,
    };
  }
}

export default new ReferralService();