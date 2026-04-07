"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugValidation = exports.deleteCommentValidation = exports.addCommentValidation = exports.addReactionValidation = exports.rejectBlogPostValidation = exports.blogPostIdValidation = exports.updateBlogPostValidation = exports.createBlogPostValidation = void 0;
const express_validator_1 = require("express-validator");
exports.createBlogPostValidation = [
    (0, express_validator_1.body)('title')
        .trim()
        .notEmpty()
        .withMessage('Title is required')
        .isLength({ min: 5, max: 300 })
        .withMessage('Title must be between 5 and 300 characters'),
    (0, express_validator_1.body)('content')
        .trim()
        .notEmpty()
        .withMessage('Content is required')
        .isLength({ min: 50 })
        .withMessage('Content must be at least 50 characters'),
    (0, express_validator_1.body)('excerpt')
        .trim()
        .notEmpty()
        .withMessage('Excerpt is required')
        .isLength({ max: 500 })
        .withMessage('Excerpt cannot exceed 500 characters'),
    (0, express_validator_1.body)('category')
        .trim()
        .notEmpty()
        .withMessage('Category is required'),
    (0, express_validator_1.body)('metaTitle')
        .optional()
        .trim()
        .isLength({ max: 70 })
        .withMessage('Meta title should not exceed 70 characters'),
    (0, express_validator_1.body)('metaDescription')
        .optional()
        .trim()
        .isLength({ max: 160 })
        .withMessage('Meta description should not exceed 160 characters'),
    (0, express_validator_1.body)('keywords')
        .optional()
        .custom((value) => {
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed);
            }
            catch {
                return false;
            }
        }
        return Array.isArray(value);
    })
        .withMessage('Keywords must be an array'),
    (0, express_validator_1.body)('tags')
        .optional()
        .custom((value) => {
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed);
            }
            catch {
                return false;
            }
        }
        return Array.isArray(value);
    })
        .withMessage('Tags must be an array'),
    (0, express_validator_1.body)('status')
        .optional()
        .isIn(['draft', 'pending', 'published'])
        .withMessage('Invalid status'),
];
exports.updateBlogPostValidation = [
    (0, express_validator_1.param)('postId')
        .isMongoId()
        .withMessage('Invalid post ID'),
    (0, express_validator_1.body)('title')
        .optional()
        .trim()
        .isLength({ min: 5, max: 300 })
        .withMessage('Title must be between 5 and 300 characters'),
    (0, express_validator_1.body)('content')
        .optional()
        .trim()
        .isLength({ min: 50 })
        .withMessage('Content must be at least 50 characters'),
    (0, express_validator_1.body)('excerpt')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Excerpt cannot exceed 500 characters'),
    (0, express_validator_1.body)('metaTitle')
        .optional()
        .trim()
        .isLength({ max: 70 })
        .withMessage('Meta title should not exceed 70 characters'),
    (0, express_validator_1.body)('metaDescription')
        .optional()
        .trim()
        .isLength({ max: 160 })
        .withMessage('Meta description should not exceed 160 characters'),
];
exports.blogPostIdValidation = [
    (0, express_validator_1.param)('postId')
        .isMongoId()
        .withMessage('Invalid post ID'),
];
exports.rejectBlogPostValidation = [
    (0, express_validator_1.param)('postId')
        .isMongoId()
        .withMessage('Invalid post ID'),
    (0, express_validator_1.body)('reason')
        .trim()
        .notEmpty()
        .withMessage('Rejection reason is required'),
];
exports.addReactionValidation = [
    (0, express_validator_1.param)('postId')
        .isMongoId()
        .withMessage('Invalid post ID'),
    (0, express_validator_1.body)('type')
        .isIn(['like', 'love', 'insightful', 'helpful'])
        .withMessage('Invalid reaction type'),
];
exports.addCommentValidation = [
    (0, express_validator_1.param)('postId')
        .isMongoId()
        .withMessage('Invalid post ID'),
    (0, express_validator_1.body)('content')
        .trim()
        .notEmpty()
        .withMessage('Comment content is required')
        .isLength({ max: 2000 })
        .withMessage('Comment cannot exceed 2000 characters'),
    (0, express_validator_1.body)('name')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Name cannot exceed 50 characters'),
];
exports.deleteCommentValidation = [
    (0, express_validator_1.param)('postId')
        .isMongoId()
        .withMessage('Invalid post ID'),
    (0, express_validator_1.param)('commentId')
        .isMongoId()
        .withMessage('Invalid comment ID'),
];
exports.slugValidation = [
    (0, express_validator_1.param)('slug')
        .trim()
        .notEmpty()
        .withMessage('Slug is required'),
];
//# sourceMappingURL=blog.validation.js.map