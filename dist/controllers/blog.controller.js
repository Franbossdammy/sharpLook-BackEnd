"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const blog_service_1 = __importDefault(require("../services/blog.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
const cloudinary_1 = require("../utils/cloudinary");
class BlogController {
    constructor() {
        // ==================== PUBLIC ENDPOINTS ====================
        /**
         * Get published blog posts
         * GET /api/v1/blog
         */
        this.getPosts = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                category: req.query.category,
                tag: req.query.tag,
                keyword: req.query.keyword,
                search: req.query.search,
                featured: req.query.featured === 'true',
            };
            // Remove falsy filters
            Object.keys(filters).forEach((key) => {
                if (!filters[key]) {
                    delete filters[key];
                }
            });
            const result = await blog_service_1.default.getPublishedPosts(page, limit, filters);
            return response_1.default.paginated(res, 'Blog posts retrieved successfully', result.posts, page, limit, result.total);
        });
        /**
         * Get a single post by slug
         * GET /api/v1/blog/post/:slug
         */
        this.getPostBySlug = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { slug } = req.params;
            const post = await blog_service_1.default.getPostBySlug(slug);
            return response_1.default.success(res, 'Blog post retrieved successfully', { post });
        });
        /**
         * Get blog categories
         * GET /api/v1/blog/categories
         */
        this.getCategories = (0, error_1.asyncHandler)(async (_req, res, _next) => {
            const categories = await blog_service_1.default.getCategories();
            return response_1.default.success(res, 'Categories retrieved successfully', { categories });
        });
        /**
         * Get blog keywords
         * GET /api/v1/blog/keywords
         */
        this.getKeywords = (0, error_1.asyncHandler)(async (_req, res, _next) => {
            const keywords = await blog_service_1.default.getKeywords();
            return response_1.default.success(res, 'Keywords retrieved successfully', { keywords });
        });
        // ==================== AUTHENTICATED ENDPOINTS ====================
        /**
         * Add reaction to a post
         * POST /api/v1/blog/:postId/react
         */
        this.addReaction = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { postId } = req.params;
            const userId = req.user?.id || null;
            const sessionId = !userId ? (req.ip || 'anonymous') : null;
            const { type } = req.body;
            const post = await blog_service_1.default.toggleReaction(postId, userId, sessionId, type);
            return response_1.default.success(res, 'Reaction updated', {
                likesCount: post.likesCount,
                reactions: post.reactions,
            });
        });
        /**
         * Add comment to a post
         * POST /api/v1/blog/:postId/comment
         */
        this.addComment = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { postId } = req.params;
            const userId = req.user?.id;
            const { content, name } = req.body;
            const post = await blog_service_1.default.addComment(postId, userId || null, content, name);
            return response_1.default.success(res, 'Comment added successfully', {
                comments: post.comments,
                commentsCount: post.commentsCount,
            }, 201);
        });
        /**
         * Delete a comment
         * DELETE /api/v1/blog/:postId/comment/:commentId
         */
        this.deleteComment = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { postId, commentId } = req.params;
            const userId = req.user.id;
            const isAdmin = ['admin', 'super_admin', 'support'].includes(req.user.role);
            const post = await blog_service_1.default.deleteComment(postId, commentId, userId, isAdmin);
            return response_1.default.success(res, 'Comment deleted successfully', {
                comments: post.comments,
                commentsCount: post.commentsCount,
            });
        });
        // ==================== ADMIN ENDPOINTS ====================
        /**
         * Create a blog post (admin)
         * POST /api/v1/blog/admin
         */
        this.createPost = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
            let coverImageUrl;
            const files = req.files;
            if (files && files.length > 0) {
                coverImageUrl = await (0, cloudinary_1.uploadToCloudinary)(files[0].buffer, {
                    folder: 'sharplook/blog',
                    transformation: [
                        { width: 1200, height: 630, crop: 'limit' },
                        { quality: 'auto' },
                        { fetch_format: 'auto' },
                    ],
                });
            }
            const postData = {
                ...req.body,
                ...(coverImageUrl && { coverImage: coverImageUrl }),
            };
            // Parse JSON strings from form-data
            if (req.body.keywords && typeof req.body.keywords === 'string') {
                try {
                    postData.keywords = JSON.parse(req.body.keywords);
                }
                catch {
                    postData.keywords = [];
                }
            }
            if (req.body.tags && typeof req.body.tags === 'string') {
                try {
                    postData.tags = JSON.parse(req.body.tags);
                }
                catch {
                    postData.tags = [];
                }
            }
            const post = await blog_service_1.default.createPost(userId, isAdmin, postData);
            return response_1.default.success(res, isAdmin ? 'Blog post created successfully' : 'Blog post submitted for review', { post }, 201);
        });
        /**
         * Update a blog post (admin)
         * PUT /api/v1/blog/admin/:postId
         */
        this.updatePost = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { postId } = req.params;
            const userId = req.user.id;
            const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
            const updates = { ...req.body };
            // Handle cover image upload
            const files = req.files;
            if (files && files.length > 0) {
                const coverImageUrl = await (0, cloudinary_1.uploadToCloudinary)(files[0].buffer, {
                    folder: 'sharplook/blog',
                    transformation: [
                        { width: 1200, height: 630, crop: 'limit' },
                        { quality: 'auto' },
                        { fetch_format: 'auto' },
                    ],
                });
                updates.coverImage = coverImageUrl;
            }
            // Parse JSON strings
            if (req.body.keywords && typeof req.body.keywords === 'string') {
                try {
                    updates.keywords = JSON.parse(req.body.keywords);
                }
                catch { /* keep as-is */ }
            }
            if (req.body.tags && typeof req.body.tags === 'string') {
                try {
                    updates.tags = JSON.parse(req.body.tags);
                }
                catch { /* keep as-is */ }
            }
            const post = await blog_service_1.default.updatePost(postId, userId, isAdmin, updates);
            return response_1.default.success(res, 'Blog post updated successfully', { post });
        });
        /**
         * Delete a blog post (admin)
         * DELETE /api/v1/blog/admin/:postId
         */
        this.deletePost = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { postId } = req.params;
            const userId = req.user.id;
            await blog_service_1.default.deletePost(postId, userId);
            return response_1.default.success(res, 'Blog post deleted successfully');
        });
        /**
         * Approve a blog post
         * POST /api/v1/blog/admin/:postId/approve
         */
        this.approvePost = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { postId } = req.params;
            const adminId = req.user.id;
            const post = await blog_service_1.default.approvePost(postId, adminId);
            return response_1.default.success(res, 'Blog post approved and published', { post });
        });
        /**
         * Reject a blog post
         * POST /api/v1/blog/admin/:postId/reject
         */
        this.rejectPost = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { postId } = req.params;
            const adminId = req.user.id;
            const { reason } = req.body;
            const post = await blog_service_1.default.rejectPost(postId, adminId, reason);
            return response_1.default.success(res, 'Blog post rejected', { post });
        });
        /**
         * Hide a blog post
         * POST /api/v1/blog/admin/:postId/hide
         */
        this.hidePost = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { postId } = req.params;
            const adminId = req.user.id;
            const post = await blog_service_1.default.hidePost(postId, adminId);
            return response_1.default.success(res, 'Blog post hidden', { post });
        });
        /**
         * Toggle featured status
         * POST /api/v1/blog/admin/:postId/feature
         */
        this.toggleFeatured = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { postId } = req.params;
            const post = await blog_service_1.default.toggleFeatured(postId);
            return response_1.default.success(res, `Post ${post.isFeatured ? 'featured' : 'unfeatured'}`, { post });
        });
        /**
         * Get all posts for admin
         * GET /api/v1/blog/admin
         */
        this.getAdminPosts = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                status: req.query.status,
                category: req.query.category,
                author: req.query.author,
                search: req.query.search,
            };
            Object.keys(filters).forEach((key) => {
                if (!filters[key]) {
                    delete filters[key];
                }
            });
            const result = await blog_service_1.default.getAllPostsAdmin(page, limit, filters);
            return response_1.default.paginated(res, 'Blog posts retrieved successfully', result.posts, page, limit, result.total);
        });
        /**
         * Get pending posts
         * GET /api/v1/blog/admin/pending
         */
        this.getPendingPosts = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await blog_service_1.default.getPendingPosts(page, limit);
            return response_1.default.paginated(res, 'Pending blog posts retrieved successfully', result.posts, page, limit, result.total);
        });
        /**
         * Get blog stats
         * GET /api/v1/blog/admin/stats
         */
        this.getStats = (0, error_1.asyncHandler)(async (_req, res, _next) => {
            const stats = await blog_service_1.default.getStats();
            return response_1.default.success(res, 'Blog statistics retrieved', stats);
        });
        /**
         * Get a single post by ID (admin)
         * GET /api/v1/blog/admin/:postId
         */
        this.getPostById = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { postId } = req.params;
            const post = await blog_service_1.default.getPostById(postId);
            return response_1.default.success(res, 'Blog post retrieved successfully', { post });
        });
        /**
         * Toggle comment visibility (admin)
         * POST /api/v1/blog/admin/:postId/comment/:commentId/toggle
         */
        this.toggleCommentVisibility = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { postId, commentId } = req.params;
            const post = await blog_service_1.default.toggleCommentVisibility(postId, commentId);
            return response_1.default.success(res, 'Comment visibility toggled', {
                comments: post.comments,
            });
        });
    }
}
exports.default = new BlogController();
//# sourceMappingURL=blog.controller.js.map