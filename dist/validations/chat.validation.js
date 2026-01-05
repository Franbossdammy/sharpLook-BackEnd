"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessagesValidation = exports.getConversationsValidation = exports.searchMessagesValidation = exports.messageIdValidation = exports.conversationIdValidation = exports.sendMessageValidation = exports.createConversationValidation = void 0;
const express_validator_1 = require("express-validator");
exports.createConversationValidation = [
    (0, express_validator_1.body)('otherUserId').notEmpty().isMongoId().withMessage('Invalid user ID'),
    (0, express_validator_1.body)('bookingId').optional().isMongoId().withMessage('Invalid booking ID'),
];
exports.sendMessageValidation = [
    (0, express_validator_1.body)('text')
        .optional()
        .trim()
        .isLength({ min: 1, max: 5000 })
        .withMessage('Message must be 1-5000 characters'),
    (0, express_validator_1.body)('messageType')
        .optional()
        .isIn(['text', 'image', 'file', 'audio', 'video'])
        .withMessage('Invalid message type'),
    (0, express_validator_1.body)('attachments').optional().isArray().withMessage('Attachments must be an array'),
    (0, express_validator_1.body)('attachments.*.url').optional().isURL().withMessage('Invalid URL'),
    (0, express_validator_1.body)('attachments.*.type')
        .optional()
        .isIn(['image', 'file', 'audio', 'video'])
        .withMessage('Invalid attachment type'),
];
exports.conversationIdValidation = [
    (0, express_validator_1.param)('conversationId').isMongoId().withMessage('Invalid conversation ID'),
];
exports.messageIdValidation = [
    (0, express_validator_1.param)('messageId').isMongoId().withMessage('Invalid message ID'),
];
exports.searchMessagesValidation = [
    (0, express_validator_1.query)('query')
        .notEmpty()
        .trim()
        .isLength({ min: 2 })
        .withMessage('Search query must be at least 2 characters'),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be 1-100'),
];
exports.getConversationsValidation = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be 1-100'),
];
exports.getMessagesValidation = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be 1-100'),
];
//# sourceMappingURL=chat.validation.js.map