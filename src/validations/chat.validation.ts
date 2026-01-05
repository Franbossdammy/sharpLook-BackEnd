import { body, param, query } from 'express-validator';

export const createConversationValidation = [
  body('otherUserId').notEmpty().isMongoId().withMessage('Invalid user ID'),
  body('bookingId').optional().isMongoId().withMessage('Invalid booking ID'),
];

export const sendMessageValidation = [
  body('text')
    .optional()
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message must be 1-5000 characters'),
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'file', 'audio', 'video'])
    .withMessage('Invalid message type'),
  body('attachments').optional().isArray().withMessage('Attachments must be an array'),
  body('attachments.*.url').optional().isURL().withMessage('Invalid URL'),
  body('attachments.*.type')
    .optional()
    .isIn(['image', 'file', 'audio', 'video'])
    .withMessage('Invalid attachment type'),
];

export const conversationIdValidation = [
  param('conversationId').isMongoId().withMessage('Invalid conversation ID'),
];

export const messageIdValidation = [
  param('messageId').isMongoId().withMessage('Invalid message ID'),
];

export const searchMessagesValidation = [
  query('query')
    .notEmpty()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be 1-100'),
];

export const getConversationsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be 1-100'),
];

export const getMessagesValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be 1-100'),
];
