import Message, { IMessage } from '../models/Message';
import Conversation, { IConversation } from '../models/Conversation';
import User from '../models/User';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { parsePaginationParams } from '../utils/helpers';
import logger from '../utils/logger';
import mongoose from 'mongoose';

class MessageService {
  /**
   * Get or create conversation between two users
   */
  public async getOrCreateConversation(
    user1Id: string,
    user2Id: string
  ): Promise<IConversation> {
    // Ensure user1Id is always smaller than user2Id for consistent ordering
    const [userId1, userId2] = [user1Id, user2Id].sort();

    let conversation = await Conversation.findOne({
      participants: { $all: [userId1, userId2], $size: 2 },
    }).populate('participants', 'firstName lastName avatar isOnline lastSeen');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId1, userId2],
        unreadCount: new Map([
          [userId1, 0],
          [userId2, 0],
        ]),
      });

      await conversation.populate('participants', 'firstName lastName avatar isOnline lastSeen');

      logger.info(`New conversation created between ${userId1} and ${userId2}`);
    }

    return conversation;
  }

  /**
   * Get user's conversations with pagination
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

    const query = {
      participants: userId,
      isDeleted: { $ne: true },
    };

    const [conversations, total] = await Promise.all([
      Conversation.find(query)
        .populate('participants', 'firstName lastName avatar isOnline lastSeen')
        .populate('lastMessage.sender', 'firstName lastName avatar')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Conversation.countDocuments(query),
    ]);

    return {
      conversations,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get conversation by ID
   */
  public async getConversationById(
    conversationId: string,
    userId: string
  ): Promise<IConversation> {
    const conversation = await Conversation.findById(conversationId).populate(
      'participants',
      'firstName lastName avatar isOnline lastSeen'
    );

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    // Check if user is participant
    if (!conversation.participants.some((p: any) => p._id.toString() === userId)) {
      throw new ForbiddenError('You are not a participant in this conversation');
    }

    return conversation;
  }

  /**
   * Send a message
   */
  public async sendMessage(
    senderId: string,
    receiverId: string,
    data: {
      messageType: 'text' | 'image' | 'file' | 'audio' | 'video';
      text?: string;
      attachments?: Array<{
        url: string;
        type: 'image' | 'file' | 'audio' | 'video';
        name?: string;
        size?: number;
      }>;
      replyTo?: string; // Message ID being replied to
    }
  ): Promise<{ message: IMessage; conversation: IConversation }> {
    // Validate input
    if (data.messageType === 'text' && !data.text?.trim()) {
      throw new BadRequestError('Text message cannot be empty');
    }

    if (
      ['image', 'file', 'audio', 'video'].includes(data.messageType) &&
      (!data.attachments || data.attachments.length === 0)
    ) {
      throw new BadRequestError(`${data.messageType} message requires attachments`);
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      throw new NotFoundError('Receiver not found');
    }

    // Get or create conversation
    const conversation = await this.getOrCreateConversation(senderId, receiverId);

    // Create message
    const message = await Message.create({
      conversation: conversation._id,
      sender: senderId,
      receiver: receiverId,
      messageType: data.messageType,
      text: data.text,
      attachments: data.attachments,
      replyTo: data.replyTo,
      isDelivered: false,
      isRead: false,
    });

    // Update conversation
    const currentUnreadCount = conversation.unreadCount.get(receiverId) || 0;
    conversation.unreadCount.set(receiverId, currentUnreadCount + 1);
    conversation.lastMessage = {
      text: data.text || `Sent a ${data.messageType}`,
      sender: mongoose.Types.ObjectId.createFromHexString(senderId),
      sentAt: message.createdAt,
    };

    await conversation.save();

    // Populate message details
    await message.populate([
      { path: 'sender', select: 'firstName lastName avatar isOnline lastSeen' },
      { path: 'receiver', select: 'firstName lastName avatar isOnline lastSeen' },
      { path: 'replyTo', select: 'text sender messageType attachments' },
    ]);

    logger.info(`Message sent from ${senderId} to ${receiverId}`);

    return { message, conversation };
  }

  /**
   * Get messages in a conversation
   */
  public async getMessages(
    conversationId: string,
    userId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    messages: IMessage[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Verify user is participant
    await this.getConversationById(conversationId, userId);

    const { skip } = parsePaginationParams(page, limit);

    const query = {
      conversation: conversationId,
      isDeleted: { $ne: true },
    };

    const [messages, total] = await Promise.all([
      Message.find(query)
        .populate('sender', 'firstName lastName avatar isOnline lastSeen')
        .populate('receiver', 'firstName lastName avatar isOnline lastSeen')
        .populate({
          path: 'replyTo',
          select: 'text sender messageType attachments',
          populate: {
            path: 'sender',
            select: 'firstName lastName avatar',
          },
        })
        .populate({
          path: 'reactions.user',
          select: 'firstName lastName avatar',
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Message.countDocuments(query),
    ]);

    return {
      messages: messages.reverse(), // Reverse to show oldest first
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Mark message as delivered
   */
  public async markAsDelivered(messageId: string, userId: string): Promise<IMessage> {
    const message = await Message.findById(messageId);

    if (!message) {
      throw new NotFoundError('Message not found');
    }

    // Only receiver can mark as delivered
    if (message.receiver.toString() !== userId) {
      throw new ForbiddenError('You cannot mark this message as delivered');
    }

    if (!message.isDelivered) {
      message.isDelivered = true;
      message.deliveredAt = new Date();
      await message.save();

      logger.info(`Message ${messageId} marked as delivered`);
    }

    return message;
  }

  /**
   * Mark message as read
   */
  public async markAsRead(messageId: string, userId: string): Promise<IMessage> {
    const message = await Message.findById(messageId);

    if (!message) {
      throw new NotFoundError('Message not found');
    }

    // Only receiver can mark as read
    if (message.receiver.toString() !== userId) {
      throw new ForbiddenError('You cannot mark this message as read');
    }

    if (!message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      message.isDelivered = true;
      message.deliveredAt = message.deliveredAt || new Date();
      await message.save();

      // Update conversation unread count
      const conversation = await Conversation.findById(message.conversation);
      if (conversation) {
        const currentCount = conversation.unreadCount.get(userId) || 0;
        if (currentCount > 0) {
          conversation.unreadCount.set(userId, currentCount - 1);
          await conversation.save();
        }
      }

      logger.info(`Message ${messageId} marked as read`);
    }

    return message;
  }

  /**
   * Mark all messages in conversation as read
   */
  public async markConversationAsRead(
    conversationId: string,
    userId: string
  ): Promise<void> {
    // Verify user is participant
    await this.getConversationById(conversationId, userId);

    // Update all unread messages
    await Message.updateMany(
      {
        conversation: conversationId,
        receiver: userId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
          isDelivered: true,
          deliveredAt: new Date(),
        },
      }
    );

    // Reset unread count in conversation
    const conversation = await Conversation.findById(conversationId);
    if (conversation) {
      conversation.unreadCount.set(userId, 0);
      await conversation.save();
    }

    logger.info(`All messages in conversation ${conversationId} marked as read by ${userId}`);
  }

  /**
   * Add or update reaction to a message
   */
  public async toggleReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<IMessage> {
    const message = await Message.findById(messageId);

    if (!message) {
      throw new NotFoundError('Message not found');
    }

    // Cast to any to access reactions property
    const msg = message as any;

    // Initialize reactions array if it doesn't exist
    if (!msg.reactions) {
      msg.reactions = [];
    }

    // Check if user already reacted with this emoji
    const existingReactionIndex = msg.reactions.findIndex(
      (r: any) => r.user.toString() === userId && r.emoji === emoji
    );

    if (existingReactionIndex !== -1) {
      // Remove reaction
      msg.reactions.splice(existingReactionIndex, 1);
      logger.info(`Reaction removed from message ${messageId} by ${userId}`);
    } else {
      // Add reaction
      msg.reactions.push({
        user: mongoose.Types.ObjectId.createFromHexString(userId),
        emoji,
        createdAt: new Date(),
      });
      logger.info(`Reaction added to message ${messageId} by ${userId}`);
    }

    message.markModified('reactions');
    await message.save();

    await message.populate({
      path: 'reactions.user',
      select: 'firstName lastName avatar',
    });

    return message;
  }

  /**
   * Delete a message
   */
  public async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await Message.findById(messageId);

    if (!message) {
      throw new NotFoundError('Message not found');
    }

    // Only sender can delete their message
    if (message.sender.toString() !== userId) {
      throw new ForbiddenError('You can only delete your own messages');
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = mongoose.Types.ObjectId.createFromHexString(userId);

    await message.save();

    logger.info(`Message ${messageId} deleted by ${userId}`);
  }

  /**
   * Delete conversation
   */
  public async deleteConversation(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.getConversationById(conversationId, userId);

    conversation.isDeleted = true;
    conversation.deletedAt = new Date();

    await conversation.save();

    logger.info(`Conversation ${conversationId} deleted by ${userId}`);
  }

  /**
   * Get unread messages count for user
   */
  public async getUnreadCount(userId: string): Promise<number> {
    const conversations = await Conversation.find({
      participants: userId,
      isDeleted: { $ne: true },
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
  ): Promise<{
    messages: IMessage[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { skip } = parsePaginationParams(page, limit);

    // Get user's conversations
    const conversations = await Conversation.find({
      participants: userId,
      isDeleted: { $ne: true },
    }).distinct('_id');

    const searchQuery = {
      conversation: { $in: conversations },
      text: { $regex: query, $options: 'i' },
      isDeleted: { $ne: true },
    };

    const [messages, total] = await Promise.all([
      Message.find(searchQuery)
        .populate('sender', 'firstName lastName avatar')
        .populate('receiver', 'firstName lastName avatar')
        .populate('conversation', 'participants')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Message.countDocuments(searchQuery),
    ]);

    return {
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export default new MessageService();