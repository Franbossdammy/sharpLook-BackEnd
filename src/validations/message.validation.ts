import Joi from 'joi';

export const sendMessageValidation = Joi.object({
  receiverId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid receiver ID',
      'any.required': 'Receiver ID is required',
    }),
  messageType: Joi.string()
    .valid('text', 'image', 'file', 'audio', 'video')
    .required()
    .messages({
      'any.only': 'Message type must be one of: text, image, file, audio, video',
      'any.required': 'Message type is required',
    }),
  text: Joi.string()
    .max(5000)
    .when('messageType', {
      is: 'text',
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      'string.max': 'Message cannot exceed 5000 characters',
      'any.required': 'Text is required for text messages',
    }),
  attachments: Joi.array()
    .items(
      Joi.object({
        url: Joi.string().uri().required().messages({
          'string.uri': 'Attachment URL must be valid',
          'any.required': 'Attachment URL is required',
        }),
        type: Joi.string()
          .valid('image', 'file', 'audio', 'video')
          .required()
          .messages({
            'any.only': 'Attachment type must be one of: image, file, audio, video',
            'any.required': 'Attachment type is required',
          }),
        name: Joi.string().optional(),
        size: Joi.number().optional(),
      })
    )
    .when('messageType', {
      is: Joi.string().valid('image', 'file', 'audio', 'video'),
      then: Joi.array().required().min(1),
      otherwise: Joi.optional(),
    })
    .messages({
      'array.min': 'At least one attachment is required for non-text messages',
    }),
  replyTo: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid reply message ID',
    }),
});

export const conversationIdValidation = Joi.object({
  conversationId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid conversation ID',
      'any.required': 'Conversation ID is required',
    }),
});

export const messageIdValidation = Joi.object({
  messageId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid message ID',
      'any.required': 'Message ID is required',
    }),
});

export const otherUserIdValidation = Joi.object({
  otherUserId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid user ID',
      'any.required': 'User ID is required',
    }),
});

export const toggleReactionValidation = Joi.object({
  emoji: Joi.string()
    .required()
    .min(1)
    .max(10)
    .messages({
      'any.required': 'Emoji is required',
      'string.min': 'Emoji is required',
      'string.max': 'Invalid emoji',
    }),
});

export const searchMessagesValidation = Joi.object({
  query: Joi.string()
    .required()
    .min(1)
    .max(100)
    .messages({
      'any.required': 'Search query is required',
      'string.min': 'Search query is required',
      'string.max': 'Search query cannot exceed 100 characters',
    }),
  page: Joi.number().optional(),
  limit: Joi.number().optional(),
});