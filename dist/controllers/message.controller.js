"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const message_service_1 = __importDefault(require("../services/message.service"));
const response_1 = __importDefault(require("../utils/response"));
const cloudinary_1 = require("../utils/cloudinary");
const errors_1 = require("../utils/errors");
class MessageController {
    /**
     * Get user's conversations
     */
    async getConversations(req, res, next) {
        try {
            const userId = req.user._id.toString();
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await message_service_1.default.getUserConversations(userId, page, limit);
            response_1.default.paginated(res, 'Conversations retrieved successfully', result.conversations, result.page, limit, result.total);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get or create conversation
     */
    async getOrCreateConversation(req, res, next) {
        try {
            const userId = req.user._id.toString();
            const { otherUserId } = req.params;
            const conversation = await message_service_1.default.getOrCreateConversation(userId, otherUserId);
            response_1.default.success(res, 'Conversation retrieved successfully', conversation);
        }
        catch (error) {
            next(error);
        }
    }
    /**
    * Upload message attachment
    */
    async uploadAttachment(req, res, next) {
        try {
            if (!req.file) {
                throw new errors_1.BadRequestError('No file uploaded');
            }
            console.log('📁 Processing file:', {
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
            });
            // Get file type from mimetype
            let fileType = 'file';
            // ⭐ IMPORTANT: Handle React Native FormData bug where m4a is sent as image/m4a
            const isAudioFile = req.file.mimetype.startsWith('audio/') ||
                req.file.mimetype === 'image/m4a' ||
                req.file.originalname.endsWith('.m4a') ||
                req.file.originalname.endsWith('.mp3') ||
                req.file.originalname.endsWith('.wav');
            if (isAudioFile) {
                fileType = 'audio';
                console.log('🎤 Detected as audio file');
            }
            else if (req.file.mimetype.startsWith('image/')) {
                fileType = 'image';
                console.log('🖼️ Detected as image file');
            }
            else if (req.file.mimetype.startsWith('video/')) {
                fileType = 'video';
                console.log('🎥 Detected as video file');
            }
            else {
                console.log('📄 Detected as document file');
            }
            // Determine cloudinary resource type
            let resourceType = 'raw';
            if (fileType === 'image') {
                resourceType = 'image';
            }
            else if (fileType === 'video' || fileType === 'audio') {
                resourceType = 'video'; // Cloudinary uses 'video' for both video and audio
            }
            console.log('📤 Uploading to Cloudinary:', {
                fileType,
                resourceType,
                folder: 'message-attachments',
            });
            // Upload to cloudinary
            const uploadedUrl = await (0, cloudinary_1.uploadToCloudinary)(req.file.buffer, {
                folder: 'message-attachments',
                resource_type: resourceType,
            });
            console.log('✅ Upload successful:', uploadedUrl);
            response_1.default.success(res, 'File uploaded successfully', {
                url: uploadedUrl,
                type: fileType,
                name: req.file.originalname,
                size: req.file.size,
            });
        }
        catch (error) {
            console.error('❌ Upload error:', error);
            next(error);
        }
    }
    /**
     * Get conversation by ID
     */
    async getConversation(req, res, next) {
        try {
            const userId = req.user._id.toString();
            const { conversationId } = req.params;
            const conversation = await message_service_1.default.getConversationById(conversationId, userId);
            response_1.default.success(res, 'Conversation retrieved successfully', conversation);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Send a message - ENHANCED with Socket.IO broadcasting
     */
    async sendMessage(req, res, next) {
        try {
            const senderId = req.user._id.toString();
            const { receiverId, messageType, text, attachments, replyTo } = req.body;
            console.log('📥 HTTP message:send received');
            console.log('   From:', senderId);
            console.log('   To:', receiverId);
            console.log('   Type:', messageType);
            console.log('   Text:', text?.substring(0, 50));
            const result = await message_service_1.default.sendMessage(senderId, receiverId, {
                messageType,
                text,
                attachments,
                replyTo,
            });
            console.log('💾 Message saved via HTTP');
            console.log('   Message ID:', result.message._id);
            console.log('   Conversation ID:', result.conversation._id);
            // ✅ CRITICAL: Broadcast via Socket.IO for real-time updates
            try {
                const conversationId = result.conversation._id.toString();
                const room = `conversation:${conversationId}`;
                console.log('📤 Broadcasting message:received via HTTP controller');
                console.log('   To room:', room);
                // Get socket service instance
                const socketService = require('../socket/socket.service').default;
                const io = socketService.getIO();
                // Check room size
                const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
                console.log('   Room size:', roomSize);
                console.log('   Room members:', Array.from(io.sockets.adapter.rooms.get(room) || []));
                // Broadcast to conversation room (INCLUDING SENDER for real-time update)
                io.to(room).emit('message:received', {
                    message: result.message,
                    conversationId: conversationId,
                });
                console.log('✅ message:received broadcast complete via HTTP');
                // Also send notification to receiver's personal room
                io.to(`user:${receiverId}`).emit('message:new', {
                    message: result.message,
                    conversation: result.conversation,
                });
                console.log('✅ message:new notification sent to receiver');
            }
            catch (socketError) {
                console.error('❌ Error broadcasting via socket:', socketError);
                // Don't fail the request if socket broadcast fails
            }
            response_1.default.created(res, 'Message sent successfully', result);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get messages in a conversation
     */
    async getMessages(req, res, next) {
        try {
            const userId = req.user._id.toString();
            const { conversationId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const result = await message_service_1.default.getMessages(conversationId, userId, page, limit);
            response_1.default.paginated(res, 'Messages retrieved successfully', result.messages, result.page, limit, result.total);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Mark message as read
     */
    async markAsRead(req, res, next) {
        try {
            const userId = req.user._id.toString();
            const { messageId } = req.params;
            const message = await message_service_1.default.markAsRead(messageId, userId);
            response_1.default.success(res, 'Message marked as read', message);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Mark all messages in conversation as read
     */
    async markConversationAsRead(req, res, next) {
        try {
            const userId = req.user._id.toString();
            const { conversationId } = req.params;
            await message_service_1.default.markConversationAsRead(conversationId, userId);
            response_1.default.success(res, 'All messages marked as read', null);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Toggle reaction on a message
     */
    async toggleReaction(req, res, next) {
        try {
            const userId = req.user._id.toString();
            const { messageId } = req.params;
            const { emoji } = req.body;
            const message = await message_service_1.default.toggleReaction(messageId, userId, emoji);
            response_1.default.success(res, 'Reaction toggled successfully', message);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Delete a message
     */
    async deleteMessage(req, res, next) {
        try {
            const userId = req.user._id.toString();
            const { messageId } = req.params;
            await message_service_1.default.deleteMessage(messageId, userId);
            response_1.default.success(res, 'Message deleted successfully', null);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Delete conversation
     */
    async deleteConversation(req, res, next) {
        try {
            const userId = req.user._id.toString();
            const { conversationId } = req.params;
            await message_service_1.default.deleteConversation(conversationId, userId);
            response_1.default.success(res, 'Conversation deleted successfully', null);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get unread messages count
     */
    async getUnreadCount(req, res, next) {
        try {
            const userId = req.user._id.toString();
            const count = await message_service_1.default.getUnreadCount(userId);
            response_1.default.success(res, 'Unread count retrieved successfully', { unreadCount: count });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Search messages
     */
    async searchMessages(req, res, next) {
        try {
            const userId = req.user._id.toString();
            const { query } = req.query;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            if (!query || typeof query !== 'string') {
                response_1.default.badRequest(res, 'Search query is required');
                return;
            }
            const result = await message_service_1.default.searchMessages(userId, query, page, limit);
            response_1.default.paginated(res, 'Messages searched successfully', result.messages, result.page, limit, result.total);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.default = new MessageController();
//# sourceMappingURL=message.controller.js.map