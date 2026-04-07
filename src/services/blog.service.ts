import BlogPost, { IBlogPost, BlogPostStatus } from '../models/BlogPost';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import logger from '../utils/logger';

class BlogService {
  /**
   * Create a new blog post
   */
  public async createPost(
    authorId: string,
    isAdmin: boolean,
    postData: {
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
    }
  ): Promise<IBlogPost> {
    // Admins can publish directly, others submit for review
    let status = postData.status || BlogPostStatus.DRAFT;
    if (!isAdmin && status === BlogPostStatus.PUBLISHED) {
      status = BlogPostStatus.PENDING;
    }

    const post = await BlogPost.create({
      ...postData,
      author: authorId,
      status,
      ...(status === BlogPostStatus.PUBLISHED && {
        publishedAt: new Date(),
        approvedBy: authorId,
        approvedAt: new Date(),
      }),
    });

    logger.info(`Blog post created: ${post._id} by ${authorId}`);
    return post;
  }

  /**
   * Get published blog posts (public)
   */
  public async getPublishedPosts(
    page: number = 1,
    limit: number = 10,
    filters?: {
      category?: string;
      tag?: string;
      keyword?: string;
      search?: string;
      featured?: boolean;
    }
  ): Promise<{ posts: IBlogPost[]; total: number }> {
    const query: any = { status: BlogPostStatus.PUBLISHED };

    if (filters?.category) query.category = filters.category;
    if (filters?.tag) query.tags = { $in: [filters.tag] };
    if (filters?.keyword) query.keywords = { $in: [filters.keyword] };
    if (filters?.featured) query.isFeatured = true;
    if (filters?.search) {
      query.$text = { $search: filters.search };
    }

    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      BlogPost.find(query)
        .populate('author', 'firstName lastName avatar')
        .sort({ isFeatured: -1, publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-comments -reactions'),
      BlogPost.countDocuments(query),
    ]);

    return { posts, total };
  }

  /**
   * Get a single post by slug (public)
   */
  public async getPostBySlug(slug: string, incrementView: boolean = true): Promise<IBlogPost> {
    const post = await BlogPost.findOne({ slug, status: BlogPostStatus.PUBLISHED })
      .populate('author', 'firstName lastName avatar')
      .populate('comments.user', 'firstName lastName avatar');

    if (!post) {
      throw new NotFoundError('Blog post not found');
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
  public async getPostById(postId: string): Promise<IBlogPost> {
    const post = await BlogPost.findById(postId)
      .populate('author', 'firstName lastName avatar email')
      .populate('approvedBy', 'firstName lastName')
      .populate('comments.user', 'firstName lastName avatar');

    if (!post) {
      throw new NotFoundError('Blog post not found');
    }

    return post;
  }

  /**
   * Update a blog post
   */
  public async updatePost(
    postId: string,
    userId: string,
    isAdmin: boolean,
    updates: Partial<IBlogPost>
  ): Promise<IBlogPost> {
    const post = await BlogPost.findById(postId);
    if (!post) throw new NotFoundError('Blog post not found');

    // Only author or admin can update
    if (!isAdmin && post.author.toString() !== userId) {
      throw new ForbiddenError('You can only edit your own posts');
    }

    // If non-admin tries to publish, set to pending
    if (!isAdmin && updates.status === BlogPostStatus.PUBLISHED) {
      updates.status = BlogPostStatus.PENDING;
    }

    // If publishing, set publishedAt
    if (updates.status === BlogPostStatus.PUBLISHED && post.status !== BlogPostStatus.PUBLISHED) {
      updates.publishedAt = new Date() as any;
    }

    Object.assign(post, updates);
    await post.save();

    logger.info(`Blog post updated: ${postId} by ${userId}`);
    return post;
  }

  /**
   * Delete a blog post (soft delete)
   */
  public async deletePost(postId: string, userId: string): Promise<void> {
    const post = await BlogPost.findById(postId);
    if (!post) throw new NotFoundError('Blog post not found');

    post.isDeleted = true;
    post.deletedAt = new Date();
    post.deletedBy = userId as any;
    await post.save();

    logger.info(`Blog post deleted: ${postId} by ${userId}`);
  }

  /**
   * Approve a blog post (admin)
   */
  public async approvePost(postId: string, adminId: string): Promise<IBlogPost> {
    const post = await BlogPost.findById(postId);
    if (!post) throw new NotFoundError('Blog post not found');

    if (post.status === BlogPostStatus.PUBLISHED) {
      throw new BadRequestError('Post is already published');
    }

    post.status = BlogPostStatus.PUBLISHED;
    post.approvedBy = adminId as any;
    post.approvedAt = new Date();
    post.publishedAt = new Date();
    await post.save();

    logger.info(`Blog post approved: ${postId} by admin ${adminId}`);
    return post;
  }

  /**
   * Reject a blog post (admin)
   */
  public async rejectPost(postId: string, adminId: string, reason: string): Promise<IBlogPost> {
    const post = await BlogPost.findById(postId);
    if (!post) throw new NotFoundError('Blog post not found');

    post.status = BlogPostStatus.REJECTED;
    post.rejectionReason = reason;
    await post.save();

    logger.info(`Blog post rejected: ${postId} by admin ${adminId}`);
    return post;
  }

  /**
   * Hide a blog post (admin)
   */
  public async hidePost(postId: string, adminId: string): Promise<IBlogPost> {
    const post = await BlogPost.findById(postId);
    if (!post) throw new NotFoundError('Blog post not found');

    post.status = BlogPostStatus.HIDDEN;
    await post.save();

    logger.info(`Blog post hidden: ${postId} by admin ${adminId}`);
    return post;
  }

  /**
   * Toggle featured status (admin)
   */
  public async toggleFeatured(postId: string): Promise<IBlogPost> {
    const post = await BlogPost.findById(postId);
    if (!post) throw new NotFoundError('Blog post not found');

    post.isFeatured = !post.isFeatured;
    await post.save();

    return post;
  }

  // ==================== REACTIONS ====================

  /**
   * Add/toggle reaction (supports anonymous)
   */
  public async toggleReaction(
    postId: string,
    userId: string | null,
    sessionId: string | null,
    reactionType: 'like' | 'love' | 'insightful' | 'helpful'
  ): Promise<IBlogPost> {
    const post = await BlogPost.findById(postId);
    if (!post) throw new NotFoundError('Blog post not found');

    // Find existing reaction by userId or sessionId
    const existingIndex = post.reactions.findIndex((r) => {
      if (userId) return r.user?.toString() === userId;
      if (sessionId) return r.sessionId === sessionId;
      return false;
    });

    if (existingIndex > -1) {
      if (post.reactions[existingIndex].type === reactionType) {
        post.reactions.splice(existingIndex, 1);
      } else {
        post.reactions[existingIndex].type = reactionType;
      }
    } else {
      const reactionData: any = {
        type: reactionType,
        createdAt: new Date(),
      };
      if (userId) reactionData.user = userId;
      if (sessionId) reactionData.sessionId = sessionId;

      post.reactions.push(reactionData);
    }

    post.likesCount = post.reactions.length;
    await post.save();

    return post;
  }

  // ==================== COMMENTS ====================

  /**
   * Add a comment (supports anonymous)
   */
  public async addComment(
    postId: string,
    userId: string | null,
    content: string,
    anonymousName?: string
  ): Promise<IBlogPost> {
    const post = await BlogPost.findOne({ _id: postId, status: BlogPostStatus.PUBLISHED });
    if (!post) throw new NotFoundError('Blog post not found');

    const commentData: any = {
      content,
      isApproved: true,
      isHidden: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (userId) {
      commentData.user = userId;
    }
    if (anonymousName) {
      commentData.anonymousName = anonymousName;
    }

    post.comments.push(commentData);

    post.commentsCount = post.comments.filter(c => !c.isHidden && c.isApproved).length;
    await post.save();

    // Populate the newly added comment's user if exists
    await post.populate('comments.user', 'firstName lastName avatar');

    return post;
  }

  /**
   * Delete a comment (author or admin)
   */
  public async deleteComment(
    postId: string,
    commentId: string,
    userId: string,
    isAdmin: boolean
  ): Promise<IBlogPost> {
    const post = await BlogPost.findById(postId);
    if (!post) throw new NotFoundError('Blog post not found');

    const comment = (post.comments as any).id(commentId);
    if (!comment) throw new NotFoundError('Comment not found');

    if (!isAdmin && comment.user.toString() !== userId) {
      throw new ForbiddenError('You can only delete your own comments');
    }

    (post.comments as any).pull({ _id: commentId });
    post.commentsCount = post.comments.filter(c => !c.isHidden && c.isApproved).length;
    await post.save();

    return post;
  }

  /**
   * Hide/unhide a comment (admin)
   */
  public async toggleCommentVisibility(
    postId: string,
    commentId: string
  ): Promise<IBlogPost> {
    const post = await BlogPost.findById(postId);
    if (!post) throw new NotFoundError('Blog post not found');

    const comment = (post.comments as any).id(commentId);
    if (!comment) throw new NotFoundError('Comment not found');

    comment.isHidden = !comment.isHidden;
    post.commentsCount = post.comments.filter(c => !c.isHidden && c.isApproved).length;
    await post.save();

    return post;
  }

  // ==================== ADMIN ====================

  /**
   * Get all posts for admin (with filters)
   */
  public async getAllPostsAdmin(
    page: number = 1,
    limit: number = 10,
    filters?: {
      status?: string;
      category?: string;
      author?: string;
      search?: string;
    }
  ): Promise<{ posts: IBlogPost[]; total: number }> {
    const query: any = {};

    if (filters?.status) query.status = filters.status;
    if (filters?.category) query.category = filters.category;
    if (filters?.author) query.author = filters.author;
    if (filters?.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { content: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      BlogPost.find(query)
        .populate('author', 'firstName lastName avatar email')
        .populate('approvedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BlogPost.countDocuments(query),
    ]);

    return { posts, total };
  }

  /**
   * Get pending posts for approval
   */
  public async getPendingPosts(
    page: number = 1,
    limit: number = 10
  ): Promise<{ posts: IBlogPost[]; total: number }> {
    const query = { status: BlogPostStatus.PENDING };
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      BlogPost.find(query)
        .populate('author', 'firstName lastName avatar email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BlogPost.countDocuments(query),
    ]);

    return { posts, total };
  }

  /**
   * Get blog stats (admin)
   */
  public async getStats(): Promise<any> {
    const [total, published, pending, draft, hidden, totalViews, totalReactions] = await Promise.all([
      BlogPost.countDocuments(),
      BlogPost.countDocuments({ status: BlogPostStatus.PUBLISHED }),
      BlogPost.countDocuments({ status: BlogPostStatus.PENDING }),
      BlogPost.countDocuments({ status: BlogPostStatus.DRAFT }),
      BlogPost.countDocuments({ status: BlogPostStatus.HIDDEN }),
      BlogPost.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
      BlogPost.aggregate([{ $group: { _id: null, total: { $sum: '$likesCount' } } }]),
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
  public async getCategories(): Promise<string[]> {
    const categories = await BlogPost.distinct('category', {
      status: BlogPostStatus.PUBLISHED,
    });
    return categories;
  }

  /**
   * Get all unique keywords
   */
  public async getKeywords(): Promise<string[]> {
    const keywords = await BlogPost.distinct('keywords', {
      status: BlogPostStatus.PUBLISHED,
    });
    return keywords;
  }
}

export default new BlogService();
