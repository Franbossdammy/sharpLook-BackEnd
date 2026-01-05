import { Router } from 'express';
import messageController from '../controllers/message.controller';
import { authenticate } from '../middlewares/auth';
import { validatePagination } from '../middlewares/validate';
import { uploadMessageAttachment } from '../middlewares/message.upload.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/messages/upload
 * @desc    Upload message attachment (image, video, audio, file)
 * @access  Private
 */
router.post(
  '/upload',
  uploadMessageAttachment,
  messageController.uploadAttachment
);

/**
 * @route   GET /api/v1/messages/unread/count
 * @desc    Get unread messages count
 * @access  Private
 * @note    Must come BEFORE /conversations/:otherUserId to avoid route conflict
 */
router.get('/unread/count', messageController.getUnreadCount);

/**
 * @route   GET /api/v1/messages/search
 * @desc    Search messages
 * @access  Private
 * @note    Must come BEFORE /conversations/:otherUserId to avoid route conflict
 */
router.get(
  '/search',
  validatePagination,
  messageController.searchMessages
);

/**
 * @route   GET /api/v1/messages/conversations
 * @desc    Get user's conversations list
 * @access  Private
 */
router.get(
  '/conversations',
  validatePagination,
  messageController.getConversations
);

/**
 * @route   GET /api/v1/messages/conversations/with/:otherUserId
 * @desc    Get or create conversation with another user
 * @access  Private
 */
router.get(
  '/conversations/with/:otherUserId',  // ✅ Changed to /with/:otherUserId
  messageController.getOrCreateConversation
);

/**
 * @route   GET /api/v1/messages/conversations/:conversationId
 * @desc    Get conversation by ID
 * @access  Private
 */
router.get(
  '/conversations/:conversationId',  // ✅ Now clearly for conversation ID
  messageController.getConversation
);

/**
 * @route   GET /api/v1/messages/conversations/:conversationId/messages
 * @desc    Get messages in a conversation
 * @access  Private
 */
router.get(
  '/conversations/:conversationId/messages',  // ✅ More explicit path
  validatePagination,
  messageController.getMessages
);

/**
 * @route   PUT /api/v1/messages/conversations/:conversationId/read
 * @desc    Mark all messages in conversation as read
 * @access  Private
 */
router.put(
  '/conversations/:conversationId/read',  // ✅ Moved up for clarity
  messageController.markConversationAsRead
);

/**
 * @route   DELETE /api/v1/messages/conversations/:conversationId
 * @desc    Delete conversation
 * @access  Private
 */
router.delete(
  '/conversations/:conversationId',
  messageController.deleteConversation
);

/**
 * @route   POST /api/v1/messages/send
 * @desc    Send a message
 * @access  Private
 */
router.post(
  '/send',
  messageController.sendMessage
);

/**
 * @route   PUT /api/v1/messages/:messageId/read
 * @desc    Mark message as read
 * @access  Private
 */
router.put(
  '/:messageId/read',
  messageController.markAsRead
);

/**
 * @route   POST /api/v1/messages/:messageId/reaction
 * @desc    Toggle reaction on a message
 * @access  Private
 */
router.post(
  '/:messageId/reaction',
  messageController.toggleReaction
);

/**
 * @route   DELETE /api/v1/messages/:messageId
 * @desc    Delete a message
 * @access  Private
 */
router.delete(
  '/:messageId',
  messageController.deleteMessage
);

export default router;