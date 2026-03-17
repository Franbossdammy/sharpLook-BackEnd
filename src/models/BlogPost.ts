import mongoose, { Document, Schema, Model } from 'mongoose';

export enum BlogPostStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PUBLISHED = 'published',
  HIDDEN = 'hidden',
  REJECTED = 'rejected',
}

export interface IBlogComment {
  _id?: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  content: string;
  isApproved: boolean;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBlogReaction {
  user: mongoose.Types.ObjectId;
  type: 'like' | 'love' | 'insightful' | 'helpful';
  createdAt: Date;
}

export interface IBlogPost extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  content: string;
  excerpt: string;
  slug: string;

  author: mongoose.Types.ObjectId;
  coverImage?: string;
  images: string[];

  // SEO
  metaTitle?: string;
  metaDescription?: string;
  keywords: string[];
  canonicalUrl?: string;

  // Categorization
  category: string;
  tags: string[];

  // Status & Moderation
  status: BlogPostStatus;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  publishedAt?: Date;

  // Engagement
  views: number;
  reactions: IBlogReaction[];
  comments: IBlogComment[];
  likesCount: number;
  commentsCount: number;

  // Flags
  isFeatured: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const blogCommentSchema = new Schema<IBlogComment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      maxlength: [2000, 'Comment cannot exceed 2000 characters'],
      trim: true,
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const blogReactionSchema = new Schema<IBlogReaction>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['like', 'love', 'insightful', 'helpful'],
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const blogPostSchema = new Schema<IBlogPost>(
  {
    title: {
      type: String,
      required: [true, 'Blog title is required'],
      trim: true,
      maxlength: [300, 'Title cannot exceed 300 characters'],
      index: 'text',
    },
    content: {
      type: String,
      required: [true, 'Blog content is required'],
    },
    excerpt: {
      type: String,
      required: [true, 'Blog excerpt is required'],
      maxlength: [500, 'Excerpt cannot exceed 500 characters'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
      index: true,
    },
    coverImage: {
      type: String,
    },
    images: {
      type: [String],
      default: [],
    },

    // SEO
    metaTitle: {
      type: String,
      maxlength: [70, 'Meta title should not exceed 70 characters'],
    },
    metaDescription: {
      type: String,
      maxlength: [160, 'Meta description should not exceed 160 characters'],
    },
    keywords: {
      type: [String],
      default: [],
      index: true,
    },
    canonicalUrl: String,

    // Categorization
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },

    // Status & Moderation
    status: {
      type: String,
      enum: Object.values(BlogPostStatus),
      default: BlogPostStatus.DRAFT,
      index: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    rejectionReason: String,
    publishedAt: Date,

    // Engagement
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    reactions: [blogReactionSchema],
    comments: [blogCommentSchema],
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Flags
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
blogPostSchema.index({ title: 'text', content: 'text', keywords: 'text', tags: 'text' });
blogPostSchema.index({ status: 1, publishedAt: -1 });
blogPostSchema.index({ category: 1, status: 1 });
blogPostSchema.index({ isFeatured: -1, publishedAt: -1 });
blogPostSchema.index({ 'reactions.user': 1 });
blogPostSchema.index({ keywords: 1 });

// Auto-generate slug from title
blogPostSchema.pre('save', function (next) {
  if (this.isModified('title') || this.isNew) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Date.now();
  }

  // Auto-set metaTitle/metaDescription from title/excerpt if not provided
  if (!this.metaTitle) {
    this.metaTitle = this.title.substring(0, 70);
  }
  if (!this.metaDescription) {
    this.metaDescription = this.excerpt.substring(0, 160);
  }

  // Update counts
  this.likesCount = this.reactions?.length || 0;
  this.commentsCount = this.comments?.filter(c => !c.isHidden && c.isApproved).length || 0;

  next();
});

// Don't return deleted posts in queries by default
blogPostSchema.pre(/^find/, function (next) {
  // @ts-ignore
  this.find({ isDeleted: { $ne: true } });
  next();
});

const BlogPost: Model<IBlogPost> = mongoose.model<IBlogPost>('BlogPost', blogPostSchema);

export default BlogPost;
