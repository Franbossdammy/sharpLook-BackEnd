import { body, param } from 'express-validator';

export const createBlogPostValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 5, max: 300 })
    .withMessage('Title must be between 5 and 300 characters'),

  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ min: 50 })
    .withMessage('Content must be at least 50 characters'),

  body('excerpt')
    .trim()
    .notEmpty()
    .withMessage('Excerpt is required')
    .isLength({ max: 500 })
    .withMessage('Excerpt cannot exceed 500 characters'),

  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required'),

  body('metaTitle')
    .optional()
    .trim()
    .isLength({ max: 70 })
    .withMessage('Meta title should not exceed 70 characters'),

  body('metaDescription')
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage('Meta description should not exceed 160 characters'),

  body('keywords')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed);
        } catch {
          return false;
        }
      }
      return Array.isArray(value);
    })
    .withMessage('Keywords must be an array'),

  body('tags')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed);
        } catch {
          return false;
        }
      }
      return Array.isArray(value);
    })
    .withMessage('Tags must be an array'),

  body('status')
    .optional()
    .isIn(['draft', 'pending', 'published'])
    .withMessage('Invalid status'),
];

export const updateBlogPostValidation = [
  param('postId')
    .isMongoId()
    .withMessage('Invalid post ID'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 300 })
    .withMessage('Title must be between 5 and 300 characters'),

  body('content')
    .optional()
    .trim()
    .isLength({ min: 50 })
    .withMessage('Content must be at least 50 characters'),

  body('excerpt')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Excerpt cannot exceed 500 characters'),

  body('metaTitle')
    .optional()
    .trim()
    .isLength({ max: 70 })
    .withMessage('Meta title should not exceed 70 characters'),

  body('metaDescription')
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage('Meta description should not exceed 160 characters'),
];

export const blogPostIdValidation = [
  param('postId')
    .isMongoId()
    .withMessage('Invalid post ID'),
];

export const rejectBlogPostValidation = [
  param('postId')
    .isMongoId()
    .withMessage('Invalid post ID'),

  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Rejection reason is required'),
];

export const addReactionValidation = [
  param('postId')
    .isMongoId()
    .withMessage('Invalid post ID'),

  body('type')
    .isIn(['like', 'love', 'insightful', 'helpful'])
    .withMessage('Invalid reaction type'),
];

export const addCommentValidation = [
  param('postId')
    .isMongoId()
    .withMessage('Invalid post ID'),

  body('content')
    .trim()
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ max: 2000 })
    .withMessage('Comment cannot exceed 2000 characters'),
];

export const deleteCommentValidation = [
  param('postId')
    .isMongoId()
    .withMessage('Invalid post ID'),

  param('commentId')
    .isMongoId()
    .withMessage('Invalid comment ID'),
];

export const slugValidation = [
  param('slug')
    .trim()
    .notEmpty()
    .withMessage('Slug is required'),
];
