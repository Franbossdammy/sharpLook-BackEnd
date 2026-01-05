import { Router } from 'express';
import chatController from '../controllers/chat.controller';
import { authenticate } from '../middlewares/auth';
import { validate, validatePagination } from '../middlewares/validate';
import {
  createConversationValidation,
  sendMessageValidation,
  conversationIdValidation,
  messageIdValidation,
  searchMessagesValidation,
  getConversationsValidation,
  getMessagesValidation,
} from '../validations/chat.validation';

const router = Router();

/**
 * @route   POST /api/v1/chat/conversations
 * @desc    Create or get conversation
 * @access  Private
 */
router.post(
  '/conversations',
  authenticate,
  validate(createConversationValidation),
  chatController.createOrGetConversation
);

/**
 * @route   GET /api/v1/chat/conversations
 * @desc    Get user conversations
 * @access  Private
 */
router.get(
  '/conversations',
  authenticate,
  validatePagination,
  validate(getConversationsValidation),
  chatController.getUserConversations
);

/**
 * @route   GET /api/v1/chat/conversations/:conversationId/messages
 * @desc    Get conversation messages
 * @access  Private
 */
router.get(
  '/conversations/:conversationId/messages',
  authenticate,
  validatePagination,
  validate([...conversationIdValidation, ...getMessagesValidation]),
  chatController.getConversationMessages
);

/**
 * @route   POST /api/v1/chat/conversations/:conversationId/messages
 * @desc    Send message
 * @access  Private
 */
router.post(
  '/conversations/:conversationId/messages',
  authenticate,
  validate([...conversationIdValidation, ...sendMessageValidation]),
  chatController.sendMessage
);

/**
 * @route   PUT /api/v1/chat/conversations/:conversationId/read
 * @desc    Mark messages as read
 * @access  Private
 */
router.put(
  '/conversations/:conversationId/read',
  authenticate,
  validate(conversationIdValidation),
  chatController.markAsRead
);

/**
 * @route   POST /api/v1/chat/conversations/:conversationId/archive
 * @desc    Archive conversation
 * @access  Private
 */
router.post(
  '/conversations/:conversationId/archive',
  authenticate,
  validate(conversationIdValidation),
  chatController.archiveConversation
);

/**
 * @route   DELETE /api/v1/chat/messages/:messageId
 * @desc    Delete message
 * @access  Private
 */
router.delete(
  '/messages/:messageId',
  authenticate,
  validate(messageIdValidation),
  chatController.deleteMessage
);

/**
 * @route   GET /api/v1/chat/unread-count
 * @desc    Get unread message count
 * @access  Private
 */
router.get('/unread-count', authenticate, chatController.getUnreadCount);

/**
 * @route   GET /api/v1/chat/search
 * @desc    Search messages
 * @access  Private
 */
router.get(
  '/search',
  authenticate,
  validatePagination,
  validate(searchMessagesValidation),
  chatController.searchMessages
);

export default router;
