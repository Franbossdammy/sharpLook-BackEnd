"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const message_controller_1 = __importDefault(require("../controllers/message.controller"));
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const message_upload_middleware_1 = require("../middlewares/message.upload.middleware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
/**
 * @route   POST /api/v1/messages/upload
 * @desc    Upload message attachment (image, video, audio, file)
 * @access  Private
 */
router.post('/upload', message_upload_middleware_1.uploadMessageAttachment, message_controller_1.default.uploadAttachment);
/**
 * @route   GET /api/v1/messages/unread/count
 * @desc    Get unread messages count
 * @access  Private
 * @note    Must come BEFORE /conversations/:otherUserId to avoid route conflict
 */
router.get('/unread/count', message_controller_1.default.getUnreadCount);
/**
 * @route   GET /api/v1/messages/search
 * @desc    Search messages
 * @access  Private
 * @note    Must come BEFORE /conversations/:otherUserId to avoid route conflict
 */
router.get('/search', validate_1.validatePagination, message_controller_1.default.searchMessages);
/**
 * @route   GET /api/v1/messages/conversations
 * @desc    Get user's conversations list
 * @access  Private
 */
router.get('/conversations', validate_1.validatePagination, message_controller_1.default.getConversations);
/**
 * @route   GET /api/v1/messages/conversations/with/:otherUserId
 * @desc    Get or create conversation with another user
 * @access  Private
 */
router.get('/conversations/with/:otherUserId', // ✅ Changed to /with/:otherUserId
message_controller_1.default.getOrCreateConversation);
/**
 * @route   GET /api/v1/messages/conversations/:conversationId
 * @desc    Get conversation by ID
 * @access  Private
 */
router.get('/conversations/:conversationId', // ✅ Now clearly for conversation ID
message_controller_1.default.getConversation);
/**
 * @route   GET /api/v1/messages/conversations/:conversationId/messages
 * @desc    Get messages in a conversation
 * @access  Private
 */
router.get('/conversations/:conversationId/messages', // ✅ More explicit path
validate_1.validatePagination, message_controller_1.default.getMessages);
/**
 * @route   PUT /api/v1/messages/conversations/:conversationId/read
 * @desc    Mark all messages in conversation as read
 * @access  Private
 */
router.put('/conversations/:conversationId/read', // ✅ Moved up for clarity
message_controller_1.default.markConversationAsRead);
/**
 * @route   DELETE /api/v1/messages/conversations/:conversationId
 * @desc    Delete conversation
 * @access  Private
 */
router.delete('/conversations/:conversationId', message_controller_1.default.deleteConversation);
/**
 * @route   POST /api/v1/messages/send
 * @desc    Send a message
 * @access  Private
 */
router.post('/send', message_controller_1.default.sendMessage);
/**
 * @route   PUT /api/v1/messages/:messageId/read
 * @desc    Mark message as read
 * @access  Private
 */
router.put('/:messageId/read', message_controller_1.default.markAsRead);
/**
 * @route   POST /api/v1/messages/:messageId/reaction
 * @desc    Toggle reaction on a message
 * @access  Private
 */
router.post('/:messageId/reaction', message_controller_1.default.toggleReaction);
/**
 * @route   DELETE /api/v1/messages/:messageId
 * @desc    Delete a message
 * @access  Private
 */
router.delete('/:messageId', message_controller_1.default.deleteMessage);
exports.default = router;
//# sourceMappingURL=message.routes.js.map