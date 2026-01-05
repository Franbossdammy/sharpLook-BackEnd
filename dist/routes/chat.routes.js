"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_controller_1 = __importDefault(require("../controllers/chat.controller"));
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const chat_validation_1 = require("../validations/chat.validation");
const router = (0, express_1.Router)();
/**
 * @route   POST /api/v1/chat/conversations
 * @desc    Create or get conversation
 * @access  Private
 */
router.post('/conversations', auth_1.authenticate, (0, validate_1.validate)(chat_validation_1.createConversationValidation), chat_controller_1.default.createOrGetConversation);
/**
 * @route   GET /api/v1/chat/conversations
 * @desc    Get user conversations
 * @access  Private
 */
router.get('/conversations', auth_1.authenticate, validate_1.validatePagination, (0, validate_1.validate)(chat_validation_1.getConversationsValidation), chat_controller_1.default.getUserConversations);
/**
 * @route   GET /api/v1/chat/conversations/:conversationId/messages
 * @desc    Get conversation messages
 * @access  Private
 */
router.get('/conversations/:conversationId/messages', auth_1.authenticate, validate_1.validatePagination, (0, validate_1.validate)([...chat_validation_1.conversationIdValidation, ...chat_validation_1.getMessagesValidation]), chat_controller_1.default.getConversationMessages);
/**
 * @route   POST /api/v1/chat/conversations/:conversationId/messages
 * @desc    Send message
 * @access  Private
 */
router.post('/conversations/:conversationId/messages', auth_1.authenticate, (0, validate_1.validate)([...chat_validation_1.conversationIdValidation, ...chat_validation_1.sendMessageValidation]), chat_controller_1.default.sendMessage);
/**
 * @route   PUT /api/v1/chat/conversations/:conversationId/read
 * @desc    Mark messages as read
 * @access  Private
 */
router.put('/conversations/:conversationId/read', auth_1.authenticate, (0, validate_1.validate)(chat_validation_1.conversationIdValidation), chat_controller_1.default.markAsRead);
/**
 * @route   POST /api/v1/chat/conversations/:conversationId/archive
 * @desc    Archive conversation
 * @access  Private
 */
router.post('/conversations/:conversationId/archive', auth_1.authenticate, (0, validate_1.validate)(chat_validation_1.conversationIdValidation), chat_controller_1.default.archiveConversation);
/**
 * @route   DELETE /api/v1/chat/messages/:messageId
 * @desc    Delete message
 * @access  Private
 */
router.delete('/messages/:messageId', auth_1.authenticate, (0, validate_1.validate)(chat_validation_1.messageIdValidation), chat_controller_1.default.deleteMessage);
/**
 * @route   GET /api/v1/chat/unread-count
 * @desc    Get unread message count
 * @access  Private
 */
router.get('/unread-count', auth_1.authenticate, chat_controller_1.default.getUnreadCount);
/**
 * @route   GET /api/v1/chat/search
 * @desc    Search messages
 * @access  Private
 */
router.get('/search', auth_1.authenticate, validate_1.validatePagination, (0, validate_1.validate)(chat_validation_1.searchMessagesValidation), chat_controller_1.default.searchMessages);
exports.default = router;
//# sourceMappingURL=chat.routes.js.map