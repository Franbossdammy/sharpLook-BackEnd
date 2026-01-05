"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchMessagesValidation = exports.toggleReactionValidation = exports.otherUserIdValidation = exports.messageIdValidation = exports.conversationIdValidation = exports.sendMessageValidation = void 0;
const joi_1 = __importDefault(require("joi"));
exports.sendMessageValidation = joi_1.default.object({
    receiverId: joi_1.default.string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
        'string.pattern.base': 'Invalid receiver ID',
        'any.required': 'Receiver ID is required',
    }),
    messageType: joi_1.default.string()
        .valid('text', 'image', 'file', 'audio', 'video')
        .required()
        .messages({
        'any.only': 'Message type must be one of: text, image, file, audio, video',
        'any.required': 'Message type is required',
    }),
    text: joi_1.default.string()
        .max(5000)
        .when('messageType', {
        is: 'text',
        then: joi_1.default.required(),
        otherwise: joi_1.default.optional(),
    })
        .messages({
        'string.max': 'Message cannot exceed 5000 characters',
        'any.required': 'Text is required for text messages',
    }),
    attachments: joi_1.default.array()
        .items(joi_1.default.object({
        url: joi_1.default.string().uri().required().messages({
            'string.uri': 'Attachment URL must be valid',
            'any.required': 'Attachment URL is required',
        }),
        type: joi_1.default.string()
            .valid('image', 'file', 'audio', 'video')
            .required()
            .messages({
            'any.only': 'Attachment type must be one of: image, file, audio, video',
            'any.required': 'Attachment type is required',
        }),
        name: joi_1.default.string().optional(),
        size: joi_1.default.number().optional(),
    }))
        .when('messageType', {
        is: joi_1.default.string().valid('image', 'file', 'audio', 'video'),
        then: joi_1.default.array().required().min(1),
        otherwise: joi_1.default.optional(),
    })
        .messages({
        'array.min': 'At least one attachment is required for non-text messages',
    }),
    replyTo: joi_1.default.string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .optional()
        .messages({
        'string.pattern.base': 'Invalid reply message ID',
    }),
});
exports.conversationIdValidation = joi_1.default.object({
    conversationId: joi_1.default.string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
        'string.pattern.base': 'Invalid conversation ID',
        'any.required': 'Conversation ID is required',
    }),
});
exports.messageIdValidation = joi_1.default.object({
    messageId: joi_1.default.string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
        'string.pattern.base': 'Invalid message ID',
        'any.required': 'Message ID is required',
    }),
});
exports.otherUserIdValidation = joi_1.default.object({
    otherUserId: joi_1.default.string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
        'string.pattern.base': 'Invalid user ID',
        'any.required': 'User ID is required',
    }),
});
exports.toggleReactionValidation = joi_1.default.object({
    emoji: joi_1.default.string()
        .required()
        .min(1)
        .max(10)
        .messages({
        'any.required': 'Emoji is required',
        'string.min': 'Emoji is required',
        'string.max': 'Invalid emoji',
    }),
});
exports.searchMessagesValidation = joi_1.default.object({
    query: joi_1.default.string()
        .required()
        .min(1)
        .max(100)
        .messages({
        'any.required': 'Search query is required',
        'string.min': 'Search query is required',
        'string.max': 'Search query cannot exceed 100 characters',
    }),
    page: joi_1.default.number().optional(),
    limit: joi_1.default.number().optional(),
});
//# sourceMappingURL=message.validation.js.map