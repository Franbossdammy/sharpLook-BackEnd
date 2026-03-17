"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BlogPost_1 = __importStar(require("../models/BlogPost"));
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
class BlogService {
    /**
     * Create a new blog post
     */
    async createPost(authorId, isAdmin, postData) {
        // Admins can publish directly, others submit for review
        let status = postData.status || BlogPost_1.BlogPostStatus.DRAFT;
        if (!isAdmin && status === BlogPost_1.BlogPostStatus.PUBLISHED) {
            status = BlogPost_1.BlogPostStatus.PENDING;
        }
        const post = await BlogPost_1.default.create({
            ...postData,
            author: authorId,
            status,
            ...(status === BlogPost_1.BlogPostStatus.PUBLISHED && {
                publishedAt: new Date(),
                approvedBy: authorId,
                approvedAt: new Date(),
            }),
        });
        logger_1.default.info(`Blog post created: ${post._id} by ${authorId}`);
        return post;
    }
    /**
     * Get published blog posts (public)
     */
    async getPublishedPosts(page = 1, limit = 10, filters) {
        const query = { status: BlogPost_1.BlogPostStatus.PUBLISHED };
        if (filters?.category)
            query.category = filters.category;
        if (filters?.tag)
            query.tags = { $in: [filters.tag] };
        if (filters?.keyword)
            query.keywords = { $in: [filters.keyword] };
        if (filters?.featured)
            query.isFeatured = true;
        if (filters?.search) {
            query.$text = { $search: filters.search };
        }
        const skip = (page - 1) * limit;
        const [posts, total] = await Promise.all([
            BlogPost_1.default.find(query)
                .populate('author', 'firstName lastName avatar')
                .sort({ isFeatured: -1, publishedAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('-comments -reactions'),
            BlogPost_1.default.countDocuments(query),
        ]);
        return { posts, total };
    }
    /**
     * Get a single post by slug (public)
     */
    async getPostBySlug(slug, incrementView = true) {
        const post = await BlogPost_1.default.findOne({ slug, status: BlogPost_1.BlogPostStatus.PUBLISHED })
            .populate('author', 'firstName lastName avatar')
            .populate('comments.user', 'firstName lastName avatar');
        if (!post) {
            throw new errors_1.NotFoundError('Blog post not found');
        }
        if (incrementView) {
            post.views += 1;
            await post.save();
        }
        return post;
    }
    /**
     * Get a single post by ID (admin)
     */
    async getPostById(postId) {
        const post = await BlogPost_1.default.findById(postId)
            .populate('author', 'firstName lastName avatar email')
            .populate('approvedBy', 'firstName lastName')
            .populate('comments.user', 'firstName lastName avatar');
        if (!post) {
            throw new errors_1.NotFoundError('Blog post not found');
        }
        return post;
    }
    /**
     * Update a blog post
     */
    async updatePost(postId, userId, isAdmin, updates) {
        const post = await BlogPost_1.default.findById(postId);
        if (!post)
            throw new errors_1.NotFoundError('Blog post not found');
        // Only author or admin can update
        if (!isAdmin && post.author.toString() !== userId) {
            throw new errors_1.ForbiddenError('You can only edit your own posts');
        }
        // If non-admin tries to publish, set to pending
        if (!isAdmin && updates.status === BlogPost_1.BlogPostStatus.PUBLISHED) {
            updates.status = BlogPost_1.BlogPostStatus.PENDING;
        }
        // If publishing, set publishedAt
        if (updates.status === BlogPost_1.BlogPostStatus.PUBLISHED && post.status !== BlogPost_1.BlogPostStatus.PUBLISHED) {
            updates.publishedAt = new Date();
        }
        Object.assign(post, updates);
        await post.save();
        logger_1.default.info(`Blog post updated: ${postId} by ${userId}`);
        return post;
    }
    /**
     * Delete a blog post (soft delete)
     */
    async deletePost(postId, userId) {
        const post = await BlogPost_1.default.findById(postId);
        if (!post)
            throw new errors_1.NotFoundError('Blog post not found');
        post.isDeleted = true;
        post.deletedAt = new Date();
        post.deletedBy = userId;
        await post.save();
        logger_1.default.info(`Blog post deleted: ${postId} by ${userId}`);
    }
    /**
     * Approve a blog post (admin)
     */
    async approvePost(postId, adminId) {
        const post = await BlogPost_1.default.findById(postId);
        if (!post)
            throw new errors_1.NotFoundError('Blog post not found');
        if (post.status === BlogPost_1.BlogPostStatus.PUBLISHED) {
            throw new errors_1.BadRequestError('Post is already published');
        }
        post.status = BlogPost_1.BlogPostStatus.PUBLISHED;
        post.approvedBy = adminId;
        post.approvedAt = new Date();
        post.publishedAt = new Date();
        await post.save();
        logger_1.default.info(`Blog post approved: ${postId} by admin ${adminId}`);
        return post;
    }
    /**
     * Reject a blog post (admin)
     */
    async rejectPost(postId, adminId, reason) {
        const post = await BlogPost_1.default.findById(postId);
        if (!post)
            throw new errors_1.NotFoundError('Blog post not found');
        post.status = BlogPost_1.BlogPostStatus.REJECTED;
        post.rejectionReason = reason;
        await post.save();
        logger_1.default.info(`Blog post rejected: ${postId} by admin ${adminId}`);
        return post;
    }
    /**
     * Hide a blog post (admin)
     */
    async hidePost(postId, adminId) {
        const post = await BlogPost_1.default.findById(postId);
        if (!post)
            throw new errors_1.NotFoundError('Blog post not found');
        post.status = BlogPost_1.BlogPostStatus.HIDDEN;
        await post.save();
        logger_1.default.info(`Blog post hidden: ${postId} by admin ${adminId}`);
        return post;
    }
    /**
     * Toggle featured status (admin)
     */
    async toggleFeatured(postId) {
        const post = await BlogPost_1.default.findById(postId);
        if (!post)
            throw new errors_1.NotFoundError('Blog post not found');
        post.isFeatured = !post.isFeatured;
        await post.save();
        return post;
    }
    // ==================== REACTIONS ====================
    /**
     * Add/toggle reaction
     */
    async toggleReaction(postId, userId, reactionType) {
        const post = await BlogPost_1.default.findById(postId);
        if (!post)
            throw new errors_1.NotFoundError('Blog post not found');
        const existingIndex = post.reactions.findIndex((r) => r.user.toString() === userId);
        if (existingIndex > -1) {
            if (post.reactions[existingIndex].type === reactionType) {
                // Remove reaction (toggle off)
                post.reactions.splice(existingIndex, 1);
            }
            else {
                // Change reaction type
                post.reactions[existingIndex].type = reactionType;
            }
        }
        else {
            // Add new reaction
            post.reactions.push({
                user: userId,
                type: reactionType,
                createdAt: new Date(),
            });
        }
        post.likesCount = post.reactions.length;
        await post.save();
        return post;
    }
    // ==================== COMMENTS ====================
    /**
     * Add a comment
     */
    async addComment(postId, userId, content) {
        const post = await BlogPost_1.default.findOne({ _id: postId, status: BlogPost_1.BlogPostStatus.PUBLISHED });
        if (!post)
            throw new errors_1.NotFoundError('Blog post not found');
        post.comments.push({
            user: userId,
            content,
            isApproved: true,
            isHidden: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        post.commentsCount = post.comments.filter(c => !c.isHidden && c.isApproved).length;
        await post.save();
        // Populate the newly added comment's user
        await post.populate('comments.user', 'firstName lastName avatar');
        return post;
    }
    /**
     * Delete a comment (author or admin)
     */
    async deleteComment(postId, commentId, userId, isAdmin) {
        const post = await BlogPost_1.default.findById(postId);
        if (!post)
            throw new errors_1.NotFoundError('Blog post not found');
        const comment = post.comments.id(commentId);
        if (!comment)
            throw new errors_1.NotFoundError('Comment not found');
        if (!isAdmin && comment.user.toString() !== userId) {
            throw new errors_1.ForbiddenError('You can only delete your own comments');
        }
        post.comments.pull({ _id: commentId });
        post.commentsCount = post.comments.filter(c => !c.isHidden && c.isApproved).length;
        await post.save();
        return post;
    }
    /**
     * Hide/unhide a comment (admin)
     */
    async toggleCommentVisibility(postId, commentId) {
        const post = await BlogPost_1.default.findById(postId);
        if (!post)
            throw new errors_1.NotFoundError('Blog post not found');
        const comment = post.comments.id(commentId);
        if (!comment)
            throw new errors_1.NotFoundError('Comment not found');
        comment.isHidden = !comment.isHidden;
        post.commentsCount = post.comments.filter(c => !c.isHidden && c.isApproved).length;
        await post.save();
        return post;
    }
    // ==================== ADMIN ====================
    /**
     * Get all posts for admin (with filters)
     */
    async getAllPostsAdmin(page = 1, limit = 10, filters) {
        const query = {};
        if (filters?.status)
            query.status = filters.status;
        if (filters?.category)
            query.category = filters.category;
        if (filters?.author)
            query.author = filters.author;
        if (filters?.search) {
            query.$or = [
                { title: { $regex: filters.search, $options: 'i' } },
                { content: { $regex: filters.search, $options: 'i' } },
            ];
        }
        const skip = (page - 1) * limit;
        const [posts, total] = await Promise.all([
            BlogPost_1.default.find(query)
                .populate('author', 'firstName lastName avatar email')
                .populate('approvedBy', 'firstName lastName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            BlogPost_1.default.countDocuments(query),
        ]);
        return { posts, total };
    }
    /**
     * Get pending posts for approval
     */
    async getPendingPosts(page = 1, limit = 10) {
        const query = { status: BlogPost_1.BlogPostStatus.PENDING };
        const skip = (page - 1) * limit;
        const [posts, total] = await Promise.all([
            BlogPost_1.default.find(query)
                .populate('author', 'firstName lastName avatar email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            BlogPost_1.default.countDocuments(query),
        ]);
        return { posts, total };
    }
    /**
     * Get blog stats (admin)
     */
    async getStats() {
        const [total, published, pending, draft, hidden, totalViews, totalReactions] = await Promise.all([
            BlogPost_1.default.countDocuments(),
            BlogPost_1.default.countDocuments({ status: BlogPost_1.BlogPostStatus.PUBLISHED }),
            BlogPost_1.default.countDocuments({ status: BlogPost_1.BlogPostStatus.PENDING }),
            BlogPost_1.default.countDocuments({ status: BlogPost_1.BlogPostStatus.DRAFT }),
            BlogPost_1.default.countDocuments({ status: BlogPost_1.BlogPostStatus.HIDDEN }),
            BlogPost_1.default.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
            BlogPost_1.default.aggregate([{ $group: { _id: null, total: { $sum: '$likesCount' } } }]),
        ]);
        return {
            total,
            published,
            pending,
            draft,
            hidden,
            totalViews: totalViews[0]?.total || 0,
            totalReactions: totalReactions[0]?.total || 0,
        };
    }
    /**
     * Get all unique categories
     */
    async getCategories() {
        const categories = await BlogPost_1.default.distinct('category', {
            status: BlogPost_1.BlogPostStatus.PUBLISHED,
        });
        return categories;
    }
    /**
     * Get all unique keywords
     */
    async getKeywords() {
        const keywords = await BlogPost_1.default.distinct('keywords', {
            status: BlogPost_1.BlogPostStatus.PUBLISHED,
        });
        return keywords;
    }
}
exports.default = new BlogService();
//# sourceMappingURL=blog.service.js.map