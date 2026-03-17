import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import blogService from '../services/blog.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';
import { uploadToCloudinary } from '../utils/cloudinary';

class BlogController {
  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * Get published blog posts
   * GET /api/v1/blog
   */
  public getPosts = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const filters = {
        category: req.query.category as string,
        tag: req.query.tag as string,
        keyword: req.query.keyword as string,
        search: req.query.search as string,
        featured: req.query.featured === 'true',
      };

      // Remove falsy filters
      Object.keys(filters).forEach((key) => {
        if (!filters[key as keyof typeof filters]) {
          delete filters[key as keyof typeof filters];
        }
      });

      const result = await blogService.getPublishedPosts(page, limit, filters);

      return ResponseHandler.paginated(
        res,
        'Blog posts retrieved successfully',
        result.posts,
        page,
        limit,
        result.total
      );
    }
  );

  /**
   * Get a single post by slug
   * GET /api/v1/blog/post/:slug
   */
  public getPostBySlug = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { slug } = req.params;
      const post = await blogService.getPostBySlug(slug);

      return ResponseHandler.success(res, 'Blog post retrieved successfully', { post });
    }
  );

  /**
   * Get blog categories
   * GET /api/v1/blog/categories
   */
  public getCategories = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
      const categories = await blogService.getCategories();
      return ResponseHandler.success(res, 'Categories retrieved successfully', { categories });
    }
  );

  /**
   * Get blog keywords
   * GET /api/v1/blog/keywords
   */
  public getKeywords = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
      const keywords = await blogService.getKeywords();
      return ResponseHandler.success(res, 'Keywords retrieved successfully', { keywords });
    }
  );

  // ==================== AUTHENTICATED ENDPOINTS ====================

  /**
   * Add reaction to a post
   * POST /api/v1/blog/:postId/react
   */
  public addReaction = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { postId } = req.params;
      const userId = req.user!.id;
      const { type } = req.body;

      const post = await blogService.toggleReaction(postId, userId, type);

      return ResponseHandler.success(res, 'Reaction updated', {
        likesCount: post.likesCount,
        reactions: post.reactions,
      });
    }
  );

  /**
   * Add comment to a post
   * POST /api/v1/blog/:postId/comment
   */
  public addComment = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { postId } = req.params;
      const userId = req.user!.id;
      const { content } = req.body;

      const post = await blogService.addComment(postId, userId, content);

      return ResponseHandler.success(res, 'Comment added successfully', {
        comments: post.comments,
        commentsCount: post.commentsCount,
      }, 201);
    }
  );

  /**
   * Delete a comment
   * DELETE /api/v1/blog/:postId/comment/:commentId
   */
  public deleteComment = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { postId, commentId } = req.params;
      const userId = req.user!.id;
      const isAdmin = ['admin', 'super_admin', 'support'].includes(req.user!.role);

      const post = await blogService.deleteComment(postId, commentId, userId, isAdmin);

      return ResponseHandler.success(res, 'Comment deleted successfully', {
        comments: post.comments,
        commentsCount: post.commentsCount,
      });
    }
  );

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Create a blog post (admin)
   * POST /api/v1/blog/admin
   */
  public createPost = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const isAdmin = ['admin', 'super_admin'].includes(req.user!.role);

      let coverImageUrl: string | undefined;
      const files = req.files as Express.Multer.File[];

      if (files && files.length > 0) {
        coverImageUrl = await uploadToCloudinary(files[0].buffer, {
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
        try { postData.keywords = JSON.parse(req.body.keywords); } catch { postData.keywords = []; }
      }
      if (req.body.tags && typeof req.body.tags === 'string') {
        try { postData.tags = JSON.parse(req.body.tags); } catch { postData.tags = []; }
      }

      const post = await blogService.createPost(userId, isAdmin, postData);

      return ResponseHandler.success(
        res,
        isAdmin ? 'Blog post created successfully' : 'Blog post submitted for review',
        { post },
        201
      );
    }
  );

  /**
   * Update a blog post (admin)
   * PUT /api/v1/blog/admin/:postId
   */
  public updatePost = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { postId } = req.params;
      const userId = req.user!.id;
      const isAdmin = ['admin', 'super_admin'].includes(req.user!.role);

      const updates = { ...req.body };

      // Handle cover image upload
      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        const coverImageUrl = await uploadToCloudinary(files[0].buffer, {
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
        try { updates.keywords = JSON.parse(req.body.keywords); } catch { /* keep as-is */ }
      }
      if (req.body.tags && typeof req.body.tags === 'string') {
        try { updates.tags = JSON.parse(req.body.tags); } catch { /* keep as-is */ }
      }

      const post = await blogService.updatePost(postId, userId, isAdmin, updates);

      return ResponseHandler.success(res, 'Blog post updated successfully', { post });
    }
  );

  /**
   * Delete a blog post (admin)
   * DELETE /api/v1/blog/admin/:postId
   */
  public deletePost = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { postId } = req.params;
      const userId = req.user!.id;

      await blogService.deletePost(postId, userId);

      return ResponseHandler.success(res, 'Blog post deleted successfully');
    }
  );

  /**
   * Approve a blog post
   * POST /api/v1/blog/admin/:postId/approve
   */
  public approvePost = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { postId } = req.params;
      const adminId = req.user!.id;

      const post = await blogService.approvePost(postId, adminId);

      return ResponseHandler.success(res, 'Blog post approved and published', { post });
    }
  );

  /**
   * Reject a blog post
   * POST /api/v1/blog/admin/:postId/reject
   */
  public rejectPost = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { postId } = req.params;
      const adminId = req.user!.id;
      const { reason } = req.body;

      const post = await blogService.rejectPost(postId, adminId, reason);

      return ResponseHandler.success(res, 'Blog post rejected', { post });
    }
  );

  /**
   * Hide a blog post
   * POST /api/v1/blog/admin/:postId/hide
   */
  public hidePost = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { postId } = req.params;
      const adminId = req.user!.id;

      const post = await blogService.hidePost(postId, adminId);

      return ResponseHandler.success(res, 'Blog post hidden', { post });
    }
  );

  /**
   * Toggle featured status
   * POST /api/v1/blog/admin/:postId/feature
   */
  public toggleFeatured = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { postId } = req.params;

      const post = await blogService.toggleFeatured(postId);

      return ResponseHandler.success(res, `Post ${post.isFeatured ? 'featured' : 'unfeatured'}`, { post });
    }
  );

  /**
   * Get all posts for admin
   * GET /api/v1/blog/admin
   */
  public getAdminPosts = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const filters = {
        status: req.query.status as string,
        category: req.query.category as string,
        author: req.query.author as string,
        search: req.query.search as string,
      };

      Object.keys(filters).forEach((key) => {
        if (!filters[key as keyof typeof filters]) {
          delete filters[key as keyof typeof filters];
        }
      });

      const result = await blogService.getAllPostsAdmin(page, limit, filters);

      return ResponseHandler.paginated(
        res,
        'Blog posts retrieved successfully',
        result.posts,
        page,
        limit,
        result.total
      );
    }
  );

  /**
   * Get pending posts
   * GET /api/v1/blog/admin/pending
   */
  public getPendingPosts = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await blogService.getPendingPosts(page, limit);

      return ResponseHandler.paginated(
        res,
        'Pending blog posts retrieved successfully',
        result.posts,
        page,
        limit,
        result.total
      );
    }
  );

  /**
   * Get blog stats
   * GET /api/v1/blog/admin/stats
   */
  public getStats = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
      const stats = await blogService.getStats();
      return ResponseHandler.success(res, 'Blog statistics retrieved', stats);
    }
  );

  /**
   * Get a single post by ID (admin)
   * GET /api/v1/blog/admin/:postId
   */
  public getPostById = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { postId } = req.params;
      const post = await blogService.getPostById(postId);
      return ResponseHandler.success(res, 'Blog post retrieved successfully', { post });
    }
  );

  /**
   * Toggle comment visibility (admin)
   * POST /api/v1/blog/admin/:postId/comment/:commentId/toggle
   */
  public toggleCommentVisibility = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { postId, commentId } = req.params;

      const post = await blogService.toggleCommentVisibility(postId, commentId);

      return ResponseHandler.success(res, 'Comment visibility toggled', {
        comments: post.comments,
      });
    }
  );
}

export default new BlogController();
