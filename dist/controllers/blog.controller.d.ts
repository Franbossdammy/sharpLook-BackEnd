import { Response, NextFunction } from 'express';
declare class BlogController {
    /**
     * Get published blog posts
     * GET /api/v1/blog
     */
    getPosts: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get a single post by slug
     * GET /api/v1/blog/post/:slug
     */
    getPostBySlug: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get blog categories
     * GET /api/v1/blog/categories
     */
    getCategories: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get blog keywords
     * GET /api/v1/blog/keywords
     */
    getKeywords: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Add reaction to a post
     * POST /api/v1/blog/:postId/react
     */
    addReaction: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Add comment to a post
     * POST /api/v1/blog/:postId/comment
     */
    addComment: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Delete a comment
     * DELETE /api/v1/blog/:postId/comment/:commentId
     */
    deleteComment: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Create a blog post (admin)
     * POST /api/v1/blog/admin
     */
    createPost: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Update a blog post (admin)
     * PUT /api/v1/blog/admin/:postId
     */
    updatePost: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Delete a blog post (admin)
     * DELETE /api/v1/blog/admin/:postId
     */
    deletePost: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Approve a blog post
     * POST /api/v1/blog/admin/:postId/approve
     */
    approvePost: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Reject a blog post
     * POST /api/v1/blog/admin/:postId/reject
     */
    rejectPost: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Hide a blog post
     * POST /api/v1/blog/admin/:postId/hide
     */
    hidePost: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Toggle featured status
     * POST /api/v1/blog/admin/:postId/feature
     */
    toggleFeatured: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get all posts for admin
     * GET /api/v1/blog/admin
     */
    getAdminPosts: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get pending posts
     * GET /api/v1/blog/admin/pending
     */
    getPendingPosts: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get blog stats
     * GET /api/v1/blog/admin/stats
     */
    getStats: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get a single post by ID (admin)
     * GET /api/v1/blog/admin/:postId
     */
    getPostById: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Toggle comment visibility (admin)
     * POST /api/v1/blog/admin/:postId/comment/:commentId/toggle
     */
    toggleCommentVisibility: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: BlogController;
export default _default;
//# sourceMappingURL=blog.controller.d.ts.map