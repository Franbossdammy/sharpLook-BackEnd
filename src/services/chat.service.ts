import Conversation, { IConversation } from '../models/Conversation';
import Message, { IMessage } from '../models/Message';
import User from '../models/User';
import Booking from '../models/Booking';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { parsePaginationParams } from '../utils/helpers';
import logger from '../utils/logger';

class ChatService {
  /**
   * Create or get conversation
   */
  public async createOrGetConversation(
    userId: string,
    otherUserId: string,
    bookingId?: string
  ): Promise<IConversation> {
    // Verify other user exists
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      throw new NotFoundError('User not found');
    }

    // If booking provided, verify both users are part of it
    if (bookingId) {
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      const isClient = booking.client.toString() === userId;
      const isVendor = booking.vendor.toString() === userId;
      const otherIsClient = booking.client.toString() === otherUserId;
      const otherIsVendor = booking.vendor.toString() === otherUserId;

      if (!(isClient || isVendor) || !(otherIsClient || otherIsVendor)) {
        throw new ForbiddenError('Both users must be part of the booking');
      }
    }

    // Check if conversation already exists
    const existingConversation = await Conversation.findOne({
      participants: { $all: [userId, otherUserId] },
      ...(bookingId && { booking: bookingId }),
    }).populate('participants', 'firstName lastName avatar isOnline');

    if (existingConversation) {
      return existingConversation;
    }

    // Create new conversation
    const conversation = await Conversation.create({
      participants: [userId, otherUserId],
      booking: bookingId,
      isActive: true,
      unreadCount: {
        [userId]: 0,
        [otherUserId]: 0,
      },
    });

    await conversation.populate('participants', 'firstName lastName avatar isOnline');

    logger.info(`Conversation created: ${conversation._id}`);

    return conversation;
  }

  /**
   * Send message
   */
  public async sendMessage(
    conversationId: string,
    senderId: string,
    data: {
      text?: string;
      messageType?: 'text' | 'image' | 'file' | 'audio' | 'video';
      attachments?: any[];
    }
  ): Promise<IMessage> {
    // Get conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    // Verify sender is participant
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === senderId
    );
    if (!isParticipant) {
      throw new ForbiddenError('You are not part of this conversation');
    }

    // Get receiver
    const receiverId = conversation.participants.find(
      (p) => p.toString() !== senderId
    )!;

    // Validate message content
    if (!data.text && (!data.attachments || data.attachments.length === 0)) {
      throw new BadRequestError('Message must have text or attachments');
    }

    // Create message
    const message = await Message.create({
      conversation: conversationId,
      sender: senderId,
      receiver: receiverId,
      messageType: data.messageType || 'text',
      text: data.text,
      attachments: data.attachments || [],
      isRead: false,
      isDelivered: false,
    });

    // Update conversation
    conversation.lastMessage = {
      text: data.text || `Sent ${data.messageType || 'attachment'}`,
      sender: senderId as any,
      sentAt: new Date(),
    };

    // Increment unread count for receiver
    const currentUnread = conversation.unreadCount.get(receiverId.toString()) || 0;
    conversation.unreadCount.set(receiverId.toString(), currentUnread + 1);

    await conversation.save();

    // Populate sender info
    await message.populate('sender', 'firstName lastName avatar');

    logger.info(`Message sent: ${message._id} in conversation ${conversationId}`);

    return message;
  }

  /**
   * Mark messages as read
   */
  public async markAsRead(conversationId: string, userId: string): Promise<void> {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    // Verify user is participant
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId
    );
    if (!isParticipant) {
      throw new ForbiddenError('You are not part of this conversation');
    }

    // Mark all unread messages as read
    await Message.updateMany(
      {
        conversation: conversationId,
        receiver: userId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    // Reset unread count
    conversation.unreadCount.set(userId, 0);
    await conversation.save();
  }

  /**
   * Mark message as delivered
   */
  public async markAsDelivered(messageId: string): Promise<void> {
    await Message.findByIdAndUpdate(messageId, {
      isDelivered: true,
      deliveredAt: new Date(),
    });
  }

  /**
   * Get user conversations
   */
  public async getUserConversations(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    conversations: IConversation[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { skip } = parsePaginationParams(page, limit);

    const [conversations, total] = await Promise.all([
      Conversation.find({
        participants: userId,
        isActive: true,
      })
        .populate('participants', 'firstName lastName avatar isOnline lastSeen')
        .populate('booking', 'service scheduledDate status')
        .skip(skip)
        .limit(limit)
        .sort({ 'lastMessage.sentAt': -1, updatedAt: -1 }),
      Conversation.countDocuments({
        participants: userId,
        isActive: true,
      }),
    ]);

    return {
      conversations,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get conversation messages
   */
  public async getConversationMessages(
    conversationId: string,
    userId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ messages: IMessage[]; total: number; page: number; totalPages: number }> {
    // Verify user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId
    );
    if (!isParticipant) {
      throw new ForbiddenError('You are not part of this conversation');
    }

    const { skip } = parsePaginationParams(page, limit);

    const [messages, total] = await Promise.all([
      Message.find({ conversation: conversationId })
        .populate('sender', 'firstName lastName avatar')
        .populate('receiver', 'firstName lastName avatar')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }), // Latest first for pagination
      Message.countDocuments({ conversation: conversationId }),
    ]);

    return {
      messages: messages.reverse(), // Reverse for chat display (oldest first)
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Delete message
   */
  public async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new NotFoundError('Message not found');
    }

    // Verify user is sender
    if (message.sender.toString() !== userId) {
      throw new ForbiddenError('You can only delete your own messages');
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = userId as any;
    await message.save();
  }

  /**
   * Get unread message count
   */
  public async getUnreadCount(userId: string): Promise<number> {
    const conversations = await Conversation.find({
      participants: userId,
      isActive: true,
    });

    let totalUnread = 0;
    conversations.forEach((conv) => {
      totalUnread += conv.unreadCount.get(userId) || 0;
    });

    return totalUnread;
  }

  /**
   * Search messages
   */
  public async searchMessages(
    userId: string,
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ messages: IMessage[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    // Get user's conversations
    const conversations = await Conversation.find({
      participants: userId,
    }).select('_id');

    const conversationIds = conversations.map((c) => c._id);

    // Search messages
    const [messages, total] = await Promise.all([
      Message.find({
        conversation: { $in: conversationIds },
        text: { $regex: query, $options: 'i' },
      })
        .populate('sender', 'firstName lastName avatar')
        .populate('conversation')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Message.countDocuments({
        conversation: { $in: conversationIds },
        text: { $regex: query, $options: 'i' },
      }),
    ]);

    return {
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Archive conversation
   */
  public async archiveConversation(
    conversationId: string,
    userId: string
  ): Promise<void> {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId
    );
    if (!isParticipant) {
      throw new ForbiddenError('You are not part of this conversation');
    }

    conversation.isActive = false;
    await conversation.save();
  }
}

export default new ChatService();
