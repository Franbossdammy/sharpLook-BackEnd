"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Message_1 = __importDefault(require("../models/Message"));
const Conversation_1 = __importDefault(require("../models/Conversation"));
const User_1 = __importDefault(require("../models/User"));
const errors_1 = require("../utils/errors");
const helpers_1 = require("../utils/helpers");
const logger_1 = __importDefault(require("../utils/logger"));
const mongoose_1 = __importDefault(require("mongoose"));
class MessageService {
    /**
     * Get or create conversation between two users
     */
    async getOrCreateConversation(user1Id, user2Id) {
        // Ensure user1Id is always smaller than user2Id for consistent ordering
        const [userId1, userId2] = [user1Id, user2Id].sort();
        let conversation = await Conversation_1.default.findOne({
            participants: { $all: [userId1, userId2], $size: 2 },
        }).populate('participants', 'firstName lastName avatar isOnline lastSeen');
        if (!conversation) {
            conversation = await Conversation_1.default.create({
                participants: [userId1, userId2],
                unreadCount: new Map([
                    [userId1, 0],
                    [userId2, 0],
                ]),
            });
            await conversation.populate('participants', 'firstName lastName avatar isOnline lastSeen');
            logger_1.default.info(`New conversation created between ${userId1} and ${userId2}`);
        }
        return conversation;
    }
    /**
     * Get user's conversations with pagination
     */
    async getUserConversations(userId, page = 1, limit = 20) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const query = {
            participants: userId,
            isDeleted: { $ne: true },
        };
        const [conversations, total] = await Promise.all([
            Conversation_1.default.find(query)
                .populate('participants', 'firstName lastName avatar isOnline lastSeen')
                .populate('lastMessage.sender', 'firstName lastName avatar')
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit),
            Conversation_1.default.countDocuments(query),
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
    async getConversationById(conversationId, userId) {
        const conversation = await Conversation_1.default.findById(conversationId).populate('participants', 'firstName lastName avatar isOnline lastSeen');
        if (!conversation) {
            throw new errors_1.NotFoundError('Conversation not found');
        }
        // Check if user is participant
        if (!conversation.participants.some((p) => p._id.toString() === userId)) {
            throw new errors_1.ForbiddenError('You are not a participant in this conversation');
        }
        return conversation;
    }
    /**
     * Send a message
     */
    async sendMessage(senderId, receiverId, data) {
        // Validate input
        if (data.messageType === 'text' && !data.text?.trim()) {
            throw new errors_1.BadRequestError('Text message cannot be empty');
        }
        if (['image', 'file', 'audio', 'video'].includes(data.messageType) &&
            (!data.attachments || data.attachments.length === 0)) {
            throw new errors_1.BadRequestError(`${data.messageType} message requires attachments`);
        }
        // Check if receiver exists
        const receiver = await User_1.default.findById(receiverId);
        if (!receiver) {
            throw new errors_1.NotFoundError('Receiver not found');
        }
        // Get or create conversation
        const conversation = await this.getOrCreateConversation(senderId, receiverId);
        // Create message
        const message = await Message_1.default.create({
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
            sender: mongoose_1.default.Types.ObjectId.createFromHexString(senderId),
            sentAt: message.createdAt,
        };
        await conversation.save();
        // Populate message details
        await message.populate([
            { path: 'sender', select: 'firstName lastName avatar isOnline lastSeen' },
            { path: 'receiver', select: 'firstName lastName avatar isOnline lastSeen' },
            { path: 'replyTo', select: 'text sender messageType attachments' },
        ]);
        logger_1.default.info(`Message sent from ${senderId} to ${receiverId}`);
        return { message, conversation };
    }
    /**
     * Get messages in a conversation
     */
    async getMessages(conversationId, userId, page = 1, limit = 50) {
        // Verify user is participant
        await this.getConversationById(conversationId, userId);
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const query = {
            conversation: conversationId,
            isDeleted: { $ne: true },
        };
        const [messages, total] = await Promise.all([
            Message_1.default.find(query)
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
            Message_1.default.countDocuments(query),
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
    async markAsDelivered(messageId, userId) {
        const message = await Message_1.default.findById(messageId);
        if (!message) {
            throw new errors_1.NotFoundError('Message not found');
        }
        // Only receiver can mark as delivered
        if (message.receiver.toString() !== userId) {
            throw new errors_1.ForbiddenError('You cannot mark this message as delivered');
        }
        if (!message.isDelivered) {
            message.isDelivered = true;
            message.deliveredAt = new Date();
            await message.save();
            logger_1.default.info(`Message ${messageId} marked as delivered`);
        }
        return message;
    }
    /**
     * Mark message as read
     */
    async markAsRead(messageId, userId) {
        const message = await Message_1.default.findById(messageId);
        if (!message) {
            throw new errors_1.NotFoundError('Message not found');
        }
        // Only receiver can mark as read
        if (message.receiver.toString() !== userId) {
            throw new errors_1.ForbiddenError('You cannot mark this message as read');
        }
        if (!message.isRead) {
            message.isRead = true;
            message.readAt = new Date();
            message.isDelivered = true;
            message.deliveredAt = message.deliveredAt || new Date();
            await message.save();
            // Update conversation unread count
            const conversation = await Conversation_1.default.findById(message.conversation);
            if (conversation) {
                const currentCount = conversation.unreadCount.get(userId) || 0;
                if (currentCount > 0) {
                    conversation.unreadCount.set(userId, currentCount - 1);
                    await conversation.save();
                }
            }
            logger_1.default.info(`Message ${messageId} marked as read`);
        }
        return message;
    }
    /**
     * Mark all messages in conversation as read
     */
    async markConversationAsRead(conversationId, userId) {
        // Verify user is participant
        await this.getConversationById(conversationId, userId);
        // Update all unread messages
        await Message_1.default.updateMany({
            conversation: conversationId,
            receiver: userId,
            isRead: false,
        }, {
            $set: {
                isRead: true,
                readAt: new Date(),
                isDelivered: true,
                deliveredAt: new Date(),
            },
        });
        // Reset unread count in conversation
        const conversation = await Conversation_1.default.findById(conversationId);
        if (conversation) {
            conversation.unreadCount.set(userId, 0);
            await conversation.save();
        }
        logger_1.default.info(`All messages in conversation ${conversationId} marked as read by ${userId}`);
    }
    /**
     * Add or update reaction to a message
     */
    async toggleReaction(messageId, userId, emoji) {
        const message = await Message_1.default.findById(messageId);
        if (!message) {
            throw new errors_1.NotFoundError('Message not found');
        }
        // Cast to any to access reactions property
        const msg = message;
        // Initialize reactions array if it doesn't exist
        if (!msg.reactions) {
            msg.reactions = [];
        }
        // Check if user already reacted with this emoji
        const existingReactionIndex = msg.reactions.findIndex((r) => r.user.toString() === userId && r.emoji === emoji);
        if (existingReactionIndex !== -1) {
            // Remove reaction
            msg.reactions.splice(existingReactionIndex, 1);
            logger_1.default.info(`Reaction removed from message ${messageId} by ${userId}`);
        }
        else {
            // Add reaction
            msg.reactions.push({
                user: mongoose_1.default.Types.ObjectId.createFromHexString(userId),
                emoji,
                createdAt: new Date(),
            });
            logger_1.default.info(`Reaction added to message ${messageId} by ${userId}`);
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
    async deleteMessage(messageId, userId) {
        const message = await Message_1.default.findById(messageId);
        if (!message) {
            throw new errors_1.NotFoundError('Message not found');
        }
        // Only sender can delete their message
        if (message.sender.toString() !== userId) {
            throw new errors_1.ForbiddenError('You can only delete your own messages');
        }
        message.isDeleted = true;
        message.deletedAt = new Date();
        message.deletedBy = mongoose_1.default.Types.ObjectId.createFromHexString(userId);
        await message.save();
        logger_1.default.info(`Message ${messageId} deleted by ${userId}`);
    }
    /**
     * Delete conversation
     */
    async deleteConversation(conversationId, userId) {
        const conversation = await this.getConversationById(conversationId, userId);
        conversation.isDeleted = true;
        conversation.deletedAt = new Date();
        await conversation.save();
        logger_1.default.info(`Conversation ${conversationId} deleted by ${userId}`);
    }
    /**
     * Get unread messages count for user
     */
    async getUnreadCount(userId) {
        const conversations = await Conversation_1.default.find({
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
    async searchMessages(userId, query, page = 1, limit = 20) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        // Get user's conversations
        const conversations = await Conversation_1.default.find({
            participants: userId,
            isDeleted: { $ne: true },
        }).distinct('_id');
        const searchQuery = {
            conversation: { $in: conversations },
            text: { $regex: query, $options: 'i' },
            isDeleted: { $ne: true },
        };
        const [messages, total] = await Promise.all([
            Message_1.default.find(searchQuery)
                .populate('sender', 'firstName lastName avatar')
                .populate('receiver', 'firstName lastName avatar')
                .populate('conversation', 'participants')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Message_1.default.countDocuments(searchQuery),
        ]);
        return {
            messages,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
}
exports.default = new MessageService();
//# sourceMappingURL=message.service.js.map