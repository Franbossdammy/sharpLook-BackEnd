"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chat_service_1 = __importDefault(require("../services/chat.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
class ChatController {
    constructor() {
        this.createOrGetConversation = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const { otherUserId, bookingId } = req.body;
            const conversation = await chat_service_1.default.createOrGetConversation(userId, otherUserId, bookingId);
            return response_1.default.success(res, 'Conversation retrieved', { conversation });
        });
        this.sendMessage = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { conversationId } = req.params;
            const userId = req.user.id;
            const message = await chat_service_1.default.sendMessage(conversationId, userId, req.body);
            // Emit socket event would happen here via socket service
            return response_1.default.created(res, 'Message sent', { message });
        });
        this.markAsRead = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { conversationId } = req.params;
            const userId = req.user.id;
            await chat_service_1.default.markAsRead(conversationId, userId);
            return response_1.default.success(res, 'Messages marked as read');
        });
        this.getUserConversations = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await chat_service_1.default.getUserConversations(userId, page, limit);
            return response_1.default.paginated(res, 'Conversations retrieved', result.conversations, page, limit, result.total);
        });
        this.getConversationMessages = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { conversationId } = req.params;
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const result = await chat_service_1.default.getConversationMessages(conversationId, userId, page, limit);
            return response_1.default.paginated(res, 'Messages retrieved', result.messages, page, limit, result.total);
        });
        this.deleteMessage = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { messageId } = req.params;
            const userId = req.user.id;
            await chat_service_1.default.deleteMessage(messageId, userId);
            return response_1.default.success(res, 'Message deleted');
        });
        this.getUnreadCount = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const count = await chat_service_1.default.getUnreadCount(userId);
            return response_1.default.success(res, 'Unread count retrieved', { count });
        });
        this.searchMessages = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const { query } = req.query;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await chat_service_1.default.searchMessages(userId, query, page, limit);
            return response_1.default.paginated(res, 'Messages found', result.messages, page, limit, result.total);
        });
        this.archiveConversation = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { conversationId } = req.params;
            const userId = req.user.id;
            await chat_service_1.default.archiveConversation(conversationId, userId);
            return response_1.default.success(res, 'Conversation archived');
        });
    }
}
exports.default = new ChatController();
//# sourceMappingURL=chat.controller.js.map