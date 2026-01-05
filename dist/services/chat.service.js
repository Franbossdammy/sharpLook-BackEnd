"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Conversation_1 = __importDefault(require("../models/Conversation"));
const Message_1 = __importDefault(require("../models/Message"));
const User_1 = __importDefault(require("../models/User"));
const Booking_1 = __importDefault(require("../models/Booking"));
const errors_1 = require("../utils/errors");
const helpers_1 = require("../utils/helpers");
const logger_1 = __importDefault(require("../utils/logger"));
class ChatService {
    /**
     * Create or get conversation
     */
    async createOrGetConversation(userId, otherUserId, bookingId) {
        // Verify other user exists
        const otherUser = await User_1.default.findById(otherUserId);
        if (!otherUser) {
            throw new errors_1.NotFoundError('User not found');
        }
        // If booking provided, verify both users are part of it
        if (bookingId) {
            const booking = await Booking_1.default.findById(bookingId);
            if (!booking) {
                throw new errors_1.NotFoundError('Booking not found');
            }
            const isClient = booking.client.toString() === userId;
            const isVendor = booking.vendor.toString() === userId;
            const otherIsClient = booking.client.toString() === otherUserId;
            const otherIsVendor = booking.vendor.toString() === otherUserId;
            if (!(isClient || isVendor) || !(otherIsClient || otherIsVendor)) {
                throw new errors_1.ForbiddenError('Both users must be part of the booking');
            }
        }
        // Check if conversation already exists
        const existingConversation = await Conversation_1.default.findOne({
            participants: { $all: [userId, otherUserId] },
            ...(bookingId && { booking: bookingId }),
        }).populate('participants', 'firstName lastName avatar isOnline');
        if (existingConversation) {
            return existingConversation;
        }
        // Create new conversation
        const conversation = await Conversation_1.default.create({
            participants: [userId, otherUserId],
            booking: bookingId,
            isActive: true,
            unreadCount: {
                [userId]: 0,
                [otherUserId]: 0,
            },
        });
        await conversation.populate('participants', 'firstName lastName avatar isOnline');
        logger_1.default.info(`Conversation created: ${conversation._id}`);
        return conversation;
    }
    /**
     * Send message
     */
    async sendMessage(conversationId, senderId, data) {
        // Get conversation
        const conversation = await Conversation_1.default.findById(conversationId);
        if (!conversation) {
            throw new errors_1.NotFoundError('Conversation not found');
        }
        // Verify sender is participant
        const isParticipant = conversation.participants.some((p) => p.toString() === senderId);
        if (!isParticipant) {
            throw new errors_1.ForbiddenError('You are not part of this conversation');
        }
        // Get receiver
        const receiverId = conversation.participants.find((p) => p.toString() !== senderId);
        // Validate message content
        if (!data.text && (!data.attachments || data.attachments.length === 0)) {
            throw new errors_1.BadRequestError('Message must have text or attachments');
        }
        // Create message
        const message = await Message_1.default.create({
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
            sender: senderId,
            sentAt: new Date(),
        };
        // Increment unread count for receiver
        const currentUnread = conversation.unreadCount.get(receiverId.toString()) || 0;
        conversation.unreadCount.set(receiverId.toString(), currentUnread + 1);
        await conversation.save();
        // Populate sender info
        await message.populate('sender', 'firstName lastName avatar');
        logger_1.default.info(`Message sent: ${message._id} in conversation ${conversationId}`);
        return message;
    }
    /**
     * Mark messages as read
     */
    async markAsRead(conversationId, userId) {
        const conversation = await Conversation_1.default.findById(conversationId);
        if (!conversation) {
            throw new errors_1.NotFoundError('Conversation not found');
        }
        // Verify user is participant
        const isParticipant = conversation.participants.some((p) => p.toString() === userId);
        if (!isParticipant) {
            throw new errors_1.ForbiddenError('You are not part of this conversation');
        }
        // Mark all unread messages as read
        await Message_1.default.updateMany({
            conversation: conversationId,
            receiver: userId,
            isRead: false,
        }, {
            isRead: true,
            readAt: new Date(),
        });
        // Reset unread count
        conversation.unreadCount.set(userId, 0);
        await conversation.save();
    }
    /**
     * Mark message as delivered
     */
    async markAsDelivered(messageId) {
        await Message_1.default.findByIdAndUpdate(messageId, {
            isDelivered: true,
            deliveredAt: new Date(),
        });
    }
    /**
     * Get user conversations
     */
    async getUserConversations(userId, page = 1, limit = 20) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const [conversations, total] = await Promise.all([
            Conversation_1.default.find({
                participants: userId,
                isActive: true,
            })
                .populate('participants', 'firstName lastName avatar isOnline lastSeen')
                .populate('booking', 'service scheduledDate status')
                .skip(skip)
                .limit(limit)
                .sort({ 'lastMessage.sentAt': -1, updatedAt: -1 }),
            Conversation_1.default.countDocuments({
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
    async getConversationMessages(conversationId, userId, page = 1, limit = 50) {
        // Verify user is participant
        const conversation = await Conversation_1.default.findById(conversationId);
        if (!conversation) {
            throw new errors_1.NotFoundError('Conversation not found');
        }
        const isParticipant = conversation.participants.some((p) => p.toString() === userId);
        if (!isParticipant) {
            throw new errors_1.ForbiddenError('You are not part of this conversation');
        }
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const [messages, total] = await Promise.all([
            Message_1.default.find({ conversation: conversationId })
                .populate('sender', 'firstName lastName avatar')
                .populate('receiver', 'firstName lastName avatar')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }), // Latest first for pagination
            Message_1.default.countDocuments({ conversation: conversationId }),
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
    async deleteMessage(messageId, userId) {
        const message = await Message_1.default.findById(messageId);
        if (!message) {
            throw new errors_1.NotFoundError('Message not found');
        }
        // Verify user is sender
        if (message.sender.toString() !== userId) {
            throw new errors_1.ForbiddenError('You can only delete your own messages');
        }
        message.isDeleted = true;
        message.deletedAt = new Date();
        message.deletedBy = userId;
        await message.save();
    }
    /**
     * Get unread message count
     */
    async getUnreadCount(userId) {
        const conversations = await Conversation_1.default.find({
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
    async searchMessages(userId, query, page = 1, limit = 20) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        // Get user's conversations
        const conversations = await Conversation_1.default.find({
            participants: userId,
        }).select('_id');
        const conversationIds = conversations.map((c) => c._id);
        // Search messages
        const [messages, total] = await Promise.all([
            Message_1.default.find({
                conversation: { $in: conversationIds },
                text: { $regex: query, $options: 'i' },
            })
                .populate('sender', 'firstName lastName avatar')
                .populate('conversation')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Message_1.default.countDocuments({
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
    async archiveConversation(conversationId, userId) {
        const conversation = await Conversation_1.default.findById(conversationId);
        if (!conversation) {
            throw new errors_1.NotFoundError('Conversation not found');
        }
        const isParticipant = conversation.participants.some((p) => p.toString() === userId);
        if (!isParticipant) {
            throw new errors_1.ForbiddenError('You are not part of this conversation');
        }
        conversation.isActive = false;
        await conversation.save();
    }
}
exports.default = new ChatService();
//# sourceMappingURL=chat.service.js.map