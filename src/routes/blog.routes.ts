import { Router } from 'express';
import blogController from '../controllers/blog.controller';
import {
  authenticate,
  optionalAuth,
  authorize,
} from '../middlewares/auth';
import { validate, validatePagination } from '../middlewares/validate';
import {
  createBlogPostValidation,
  updateBlogPostValidation,
  blogPostIdValidation,
  rejectBlogPostValidation,
  addReactionValidation,
  addCommentValidation,
  deleteCommentValidation,
  slugValidation,
} from '../validations/blog.validation';
import { uploadMultipleImages } from '../middlewares/upload';
import { UserRole } from '../types';

const uploadBlogImages = uploadMultipleImages(5);

const router = Router();

// Content manager middleware — allows super_admin, admin, and support (acting as content managers)
const requireContentManager = authorize(
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.CONTENT_ADMIN,
  UserRole.ANALYTICS_ADMIN,
  UserRole.SUPPORT
);

// ==================== ADMIN ROUTES (before dynamic routes) ====================

/**
 * @route   GET /api/v1/blog/admin/stats
 * @desc    Get blog statistics
 * @access  Private (Admin, Content Manager)
 */
router.get(
  '/admin/stats',
  authenticate,
  requireContentManager,
  blogController.getStats
);

/**
 * @route   GET /api/v1/blog/admin/pending
 * @desc    Get pending posts for approval
 * @access  Private (Admin, Content Manager)
 */
router.get(
  '/admin/pending',
  authenticate,
  requireContentManager,
  validatePagination,
  blogController.getPendingPosts
);

/**
 * @route   GET /api/v1/blog/admin
 * @desc    Get all posts (admin view with filters)
 * @access  Private (Admin, Content Manager)
 */
router.get(
  '/admin',
  authenticate,
  requireContentManager,
  validatePagination,
  blogController.getAdminPosts
);

/**
 * @route   POST /api/v1/blog/admin
 * @desc    Create a blog post
 * @access  Private (Admin, Content Manager)
 */
router.post(
  '/admin',
  authenticate,
  requireContentManager,
  uploadBlogImages,
  validate(createBlogPostValidation),
  blogController.createPost
);

/**
 * @route   GET /api/v1/blog/admin/:postId
 * @desc    Get a single post by ID (admin)
 * @access  Private (Admin, Content Manager)
 */
router.get(
  '/admin/:postId',
  authenticate,
  requireContentManager,
  validate(blogPostIdValidation),
  blogController.getPostById
);

/**
 * @route   PUT /api/v1/blog/admin/:postId
 * @desc    Update a blog post
 * @access  Private (Admin, Content Manager)
 */
router.put(
  '/admin/:postId',
  authenticate,
  requireContentManager,
  uploadBlogImages,
  validate(updateBlogPostValidation),
  blogController.updatePost
);

/**
 * @route   DELETE /api/v1/blog/admin/:postId
 * @desc    Delete a blog post (soft delete)
 * @access  Private (Admin, Content Manager)
 */
router.delete(
  '/admin/:postId',
  authenticate,
  requireContentManager,
  validate(blogPostIdValidation),
  blogController.deletePost
);

/**
 * @route   POST /api/v1/blog/admin/:postId/approve
 * @desc    Approve a blog post
 * @access  Private (Admin)
 */
router.post(
  '/admin/:postId/approve',
  authenticate,
  requireContentManager,
  validate(blogPostIdValidation),
  blogController.approvePost
);

/**
 * @route   POST /api/v1/blog/admin/:postId/reject
 * @desc    Reject a blog post
 * @access  Private (Admin)
 */
router.post(
  '/admin/:postId/reject',
  authenticate,
  requireContentManager,
  validate(rejectBlogPostValidation),
  blogController.rejectPost
);

/**
 * @route   POST /api/v1/blog/admin/:postId/hide
 * @desc    Hide a blog post
 * @access  Private (Admin)
 */
router.post(
  '/admin/:postId/hide',
  authenticate,
  requireContentManager,
  validate(blogPostIdValidation),
  blogController.hidePost
);

/**
 * @route   POST /api/v1/blog/admin/:postId/feature
 * @desc    Toggle featured status
 * @access  Private (Admin)
 */
router.post(
  '/admin/:postId/feature',
  authenticate,
  requireContentManager,
  validate(blogPostIdValidation),
  blogController.toggleFeatured
);

/**
 * @route   POST /api/v1/blog/admin/:postId/comment/:commentId/toggle
 * @desc    Toggle comment visibility
 * @access  Private (Admin)
 */
router.post(
  '/admin/:postId/comment/:commentId/toggle',
  authenticate,
  requireContentManager,
  validate(deleteCommentValidation),
  blogController.toggleCommentVisibility
);

// ==================== PUBLIC ROUTES ====================

/**
 * @route   GET /api/v1/blog/categories
 * @desc    Get all blog categories
 * @access  Public
 */
router.get('/categories', blogController.getCategories);

/**
 * @route   GET /api/v1/blog/keywords
 * @desc    Get all blog keywords
 * @access  Public
 */
router.get('/keywords', blogController.getKeywords);

/**
 * @route   GET /api/v1/blog
 * @desc    Get published blog posts
 * @access  Public
 */
router.get(
  '/',
  optionalAuth,
  validatePagination,
  blogController.getPosts
);

/**
 * @route   GET /api/v1/blog/post/:slug
 * @desc    Get a single post by slug
 * @access  Public
 */
router.get(
  '/post/:slug',
  optionalAuth,
  validate(slugValidation),
  blogController.getPostBySlug
);

// ==================== PUBLIC ENGAGEMENT ROUTES ====================

/**
 * @route   POST /api/v1/blog/:postId/react
 * @desc    Add/toggle reaction on a post
 * @access  Public (anonymous allowed)
 */
router.post(
  '/:postId/react',
  optionalAuth,
  validate(addReactionValidation),
  blogController.addReaction
);

/**
 * @route   POST /api/v1/blog/:postId/comment
 * @desc    Add a comment to a post
 * @access  Public (anonymous allowed)
 */
router.post(
  '/:postId/comment',
  optionalAuth,
  validate(addCommentValidation),
  blogController.addComment
);

/**
 * @route   DELETE /api/v1/blog/:postId/comment/:commentId
 * @desc    Delete a comment
 * @access  Private (Author or Admin)
 */
router.delete(
  '/:postId/comment/:commentId',
  authenticate,
  validate(deleteCommentValidation),
  blogController.deleteComment
);

export default router;
