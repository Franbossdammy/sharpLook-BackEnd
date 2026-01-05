import Call, { ICall } from '../models/Call';
import { NotFoundError, BadRequestError } from '../utils/errors';
import logger from '../utils/logger';

class CallService {
  /**
   * Create a new call record
   */
  public async createCall(
    callerId: string,
    receiverId: string,
    type: 'voice' | 'video'
  ): Promise<ICall> {
    try {
      const call = await Call.create({
        caller: callerId,
        receiver: receiverId,
        type,
        status: 'initiated',
      });

      await call.populate(['caller', 'receiver']);

      logger.info(`Call created: ${call._id} from ${callerId} to ${receiverId}`);

      return call;
    } catch (error) {
      logger.error('Error creating call:', error);
      throw error;
    }
  }

  /**
   * Update call status
   */
  public async updateCallStatus(
    callId: string,
    status: ICall['status']
  ): Promise<ICall> {
    try {
      const call = await Call.findById(callId);

      if (!call) {
        throw new NotFoundError('Call not found');
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

      logger.info(`Call ${callId} status updated to: ${status}`);

      return call;
    } catch (error) {
      logger.error('Error updating call status:', error);
      throw error;
    }
  }

  /**
   * Get call by ID
   */
  public async getCallById(callId: string): Promise<ICall> {
    try {
      const call = await Call.findById(callId).populate(['caller', 'receiver']);

      if (!call) {
        throw new NotFoundError('Call not found');
      }

      return call;
    } catch (error) {
      logger.error('Error getting call:', error);
      throw error;
    }
  }

  /**
   * Get call history for a user
   */
  public async getCallHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ calls: ICall[]; total: number; page: number }> {
    try {
      const skip = (page - 1) * limit;

      const calls = await Call.find({
        $or: [{ caller: userId }, { receiver: userId }],
      })
        .populate(['caller', 'receiver'])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Call.countDocuments({
        $or: [{ caller: userId }, { receiver: userId }],
      });

      return {
        calls,
        total,
        page,
      };
    } catch (error) {
      logger.error('Error getting call history:', error);
      throw error;
    }
  }

  /**
   * Get active call for user
   */
  public async getActiveCall(userId: string): Promise<ICall | null> {
    try {
      const call = await Call.findOne({
        $or: [{ caller: userId }, { receiver: userId }],
        status: { $in: ['initiated', 'ringing', 'accepted'] },
      })
        .populate(['caller', 'receiver'])
        .sort({ createdAt: -1 });

      return call;
    } catch (error) {
      logger.error('Error getting active call:', error);
      throw error;
    }
  }

  /**
   * End call
   */
  public async endCall(callId: string): Promise<ICall> {
    return this.updateCallStatus(callId, 'ended');
  }

  /**
   * Reject call
   */
  public async rejectCall(callId: string): Promise<ICall> {
    return this.updateCallStatus(callId, 'rejected');
  }

  /**
   * Mark call as missed
   */
  public async markCallAsMissed(callId: string): Promise<ICall> {
    return this.updateCallStatus(callId, 'missed');
  }

  /**
   * Cancel call
   */
  public async cancelCall(callId: string): Promise<ICall> {
    return this.updateCallStatus(callId, 'cancelled');
  }

  /**
   * Delete call from history
   */
  public async deleteCall(callId: string, userId: string): Promise<void> {
    try {
      const call = await Call.findById(callId);

      if (!call) {
        throw new NotFoundError('Call not found');
      }

      // Only allow caller or receiver to delete
      if (
        call.caller.toString() !== userId &&
        call.receiver.toString() !== userId
      ) {
        throw new BadRequestError('Unauthorized to delete this call');
      }

      await Call.findByIdAndDelete(callId);

      logger.info(`Call ${callId} deleted by ${userId}`);
    } catch (error) {
      logger.error('Error deleting call:', error);
      throw error;
    }
  }
}

export default new CallService();