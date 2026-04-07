"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const blog_controller_1 = __importDefault(require("../controllers/blog.controller"));
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const blog_validation_1 = require("../validations/blog.validation");
const upload_1 = require("../middlewares/upload");
const types_1 = require("../types");
const uploadBlogImages = (0, upload_1.uploadMultipleImages)(5);
const router = (0, express_1.Router)();
// Content manager middleware — allows super_admin, admin, and support (acting as content managers)
const requireContentManager = (0, auth_1.authorize)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.ADMIN, types_1.UserRole.CONTENT_ADMIN, types_1.UserRole.ANALYTICS_ADMIN, types_1.UserRole.SUPPORT);
// ==================== ADMIN ROUTES (before dynamic routes) ====================
/**
 * @route   GET /api/v1/blog/admin/stats
 * @desc    Get blog statistics
 * @access  Private (Admin, Content Manager)
 */
router.get('/admin/stats', auth_1.authenticate, requireContentManager, blog_controller_1.default.getStats);
/**
 * @route   GET /api/v1/blog/admin/pending
 * @desc    Get pending posts for approval
 * @access  Private (Admin, Content Manager)
 */
router.get('/admin/pending', auth_1.authenticate, requireContentManager, validate_1.validatePagination, blog_controller_1.default.getPendingPosts);
/**
 * @route   GET /api/v1/blog/admin
 * @desc    Get all posts (admin view with filters)
 * @access  Private (Admin, Content Manager)
 */
router.get('/admin', auth_1.authenticate, requireContentManager, validate_1.validatePagination, blog_controller_1.default.getAdminPosts);
/**
 * @route   POST /api/v1/blog/admin
 * @desc    Create a blog post
 * @access  Private (Admin, Content Manager)
 */
router.post('/admin', auth_1.authenticate, requireContentManager, uploadBlogImages, (0, validate_1.validate)(blog_validation_1.createBlogPostValidation), blog_controller_1.default.createPost);
/**
 * @route   GET /api/v1/blog/admin/:postId
 * @desc    Get a single post by ID (admin)
 * @access  Private (Admin, Content Manager)
 */
router.get('/admin/:postId', auth_1.authenticate, requireContentManager, (0, validate_1.validate)(blog_validation_1.blogPostIdValidation), blog_controller_1.default.getPostById);
/**
 * @route   PUT /api/v1/blog/admin/:postId
 * @desc    Update a blog post
 * @access  Private (Admin, Content Manager)
 */
router.put('/admin/:postId', auth_1.authenticate, requireContentManager, uploadBlogImages, (0, validate_1.validate)(blog_validation_1.updateBlogPostValidation), blog_controller_1.default.updatePost);
/**
 * @route   DELETE /api/v1/blog/admin/:postId
 * @desc    Delete a blog post (soft delete)
 * @access  Private (Admin, Content Manager)
 */
router.delete('/admin/:postId', auth_1.authenticate, requireContentManager, (0, validate_1.validate)(blog_validation_1.blogPostIdValidation), blog_controller_1.default.deletePost);
/**
 * @route   POST /api/v1/blog/admin/:postId/approve
 * @desc    Approve a blog post
 * @access  Private (Admin)
 */
router.post('/admin/:postId/approve', auth_1.authenticate, requireContentManager, (0, validate_1.validate)(blog_validation_1.blogPostIdValidation), blog_controller_1.default.approvePost);
/**
 * @route   POST /api/v1/blog/admin/:postId/reject
 * @desc    Reject a blog post
 * @access  Private (Admin)
 */
router.post('/admin/:postId/reject', auth_1.authenticate, requireContentManager, (0, validate_1.validate)(blog_validation_1.rejectBlogPostValidation), blog_controller_1.default.rejectPost);
/**
 * @route   POST /api/v1/blog/admin/:postId/hide
 * @desc    Hide a blog post
 * @access  Private (Admin)
 */
router.post('/admin/:postId/hide', auth_1.authenticate, requireContentManager, (0, validate_1.validate)(blog_validation_1.blogPostIdValidation), blog_controller_1.default.hidePost);
/**
 * @route   POST /api/v1/blog/admin/:postId/feature
 * @desc    Toggle featured status
 * @access  Private (Admin)
 */
router.post('/admin/:postId/feature', auth_1.authenticate, requireContentManager, (0, validate_1.validate)(blog_validation_1.blogPostIdValidation), blog_controller_1.default.toggleFeatured);
/**
 * @route   POST /api/v1/blog/admin/:postId/comment/:commentId/toggle
 * @desc    Toggle comment visibility
 * @access  Private (Admin)
 */
router.post('/admin/:postId/comment/:commentId/toggle', auth_1.authenticate, requireContentManager, (0, validate_1.validate)(blog_validation_1.deleteCommentValidation), blog_controller_1.default.toggleCommentVisibility);
// ==================== PUBLIC ROUTES ====================
/**
 * @route   GET /api/v1/blog/categories
 * @desc    Get all blog categories
 * @access  Public
 */
router.get('/categories', blog_controller_1.default.getCategories);
/**
 * @route   GET /api/v1/blog/keywords
 * @desc    Get all blog keywords
 * @access  Public
 */
router.get('/keywords', blog_controller_1.default.getKeywords);
/**
 * @route   GET /api/v1/blog
 * @desc    Get published blog posts
 * @access  Public
 */
router.get('/', auth_1.optionalAuth, validate_1.validatePagination, blog_controller_1.default.getPosts);
/**
 * @route   GET /api/v1/blog/post/:slug
 * @desc    Get a single post by slug
 * @access  Public
 */
router.get('/post/:slug', auth_1.optionalAuth, (0, validate_1.validate)(blog_validation_1.slugValidation), blog_controller_1.default.getPostBySlug);
// ==================== PUBLIC ENGAGEMENT ROUTES ====================
/**
 * @route   POST /api/v1/blog/:postId/react
 * @desc    Add/toggle reaction on a post
 * @access  Public (anonymous allowed)
 */
router.post('/:postId/react', auth_1.optionalAuth, (0, validate_1.validate)(blog_validation_1.addReactionValidation), blog_controller_1.default.addReaction);
/**
 * @route   POST /api/v1/blog/:postId/comment
 * @desc    Add a comment to a post
 * @access  Public (anonymous allowed)
 */
router.post('/:postId/comment', auth_1.optionalAuth, (0, validate_1.validate)(blog_validation_1.addCommentValidation), blog_controller_1.default.addComment);
/**
 * @route   DELETE /api/v1/blog/:postId/comment/:commentId
 * @desc    Delete a comment
 * @access  Private (Author or Admin)
 */
router.delete('/:postId/comment/:commentId', auth_1.authenticate, (0, validate_1.validate)(blog_validation_1.deleteCommentValidation), blog_controller_1.default.deleteComment);
exports.default = router;
//# sourceMappingURL=blog.routes.js.map