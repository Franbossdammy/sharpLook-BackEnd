import { IBlogPost, BlogPostStatus } from '../models/BlogPost';
declare class BlogService {
    /**
     * Create a new blog post
     */
    createPost(authorId: string, isAdmin: boolean, postData: {
        title: string;
        content: string;
        excerpt: string;
        coverImage?: string;
        images?: string[];
        metaTitle?: string;
        metaDescription?: string;
        keywords?: string[];
        category: string;
        tags?: string[];
        status?: BlogPostStatus;
    }): Promise<IBlogPost>;
    /**
     * Get published blog posts (public)
     */
    getPublishedPosts(page?: number, limit?: number, filters?: {
        category?: string;
        tag?: string;
        keyword?: string;
        search?: string;
        featured?: boolean;
    }): Promise<{
        posts: IBlogPost[];
        total: number;
    }>;
    /**
     * Get a single post by slug (public)
     */
    getPostBySlug(slug: string, incrementView?: boolean): Promise<IBlogPost>;
    /**
     * Get a single post by ID (admin)
     */
    getPostById(postId: string): Promise<IBlogPost>;
    /**
     * Update a blog post
     */
    updatePost(postId: string, userId: string, isAdmin: boolean, updates: Partial<IBlogPost>): Promise<IBlogPost>;
    /**
     * Delete a blog post (soft delete)
     */
    deletePost(postId: string, userId: string): Promise<void>;
    /**
     * Approve a blog post (admin)
     */
    approvePost(postId: string, adminId: string): Promise<IBlogPost>;
    /**
     * Reject a blog post (admin)
     */
    rejectPost(postId: string, adminId: string, reason: string): Promise<IBlogPost>;
    /**
     * Hide a blog post (admin)
     */
    hidePost(postId: string, adminId: string): Promise<IBlogPost>;
    /**
     * Toggle featured status (admin)
     */
    toggleFeatured(postId: string): Promise<IBlogPost>;
    /**
     * Add/toggle reaction (supports anonymous)
     */
    toggleReaction(postId: string, userId: string | null, sessionId: string | null, reactionType: 'like' | 'love' | 'insightful' | 'helpful'): Promise<IBlogPost>;
    /**
     * Add a comment (supports anonymous)
     */
    addComment(postId: string, userId: string | null, content: string, anonymousName?: string): Promise<IBlogPost>;
    /**
     * Delete a comment (author or admin)
     */
    deleteComment(postId: string, commentId: string, userId: string, isAdmin: boolean): Promise<IBlogPost>;
    /**
     * Hide/unhide a comment (admin)
     */
    toggleCommentVisibility(postId: string, commentId: string): Promise<IBlogPost>;
    /**
     * Get all posts for admin (with filters)
     */
    getAllPostsAdmin(page?: number, limit?: number, filters?: {
        status?: string;
        category?: string;
        author?: string;
        search?: string;
    }): Promise<{
        posts: IBlogPost[];
        total: number;
    }>;
    /**
     * Get pending posts for approval
     */
    getPendingPosts(page?: number, limit?: number): Promise<{
        posts: IBlogPost[];
        total: number;
    }>;
    /**
     * Get blog stats (admin)
     */
    getStats(): Promise<any>;
    /**
     * Get all unique categories
     */
    getCategories(): Promise<string[]>;
    /**
     * Get all unique keywords
     */
    getKeywords(): Promise<string[]>;
}
declare const _default: BlogService;
export default _default;
//# sourceMappingURL=blog.service.d.ts.map