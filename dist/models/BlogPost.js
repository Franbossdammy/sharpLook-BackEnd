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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogPostStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var BlogPostStatus;
(function (BlogPostStatus) {
    BlogPostStatus["DRAFT"] = "draft";
    BlogPostStatus["PENDING"] = "pending";
    BlogPostStatus["PUBLISHED"] = "published";
    BlogPostStatus["HIDDEN"] = "hidden";
    BlogPostStatus["REJECTED"] = "rejected";
})(BlogPostStatus || (exports.BlogPostStatus = BlogPostStatus = {}));
const blogCommentSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },
    anonymousName: {
        type: String,
        trim: true,
        maxlength: [50, 'Name cannot exceed 50 characters'],
        default: 'Anonymous',
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
}, { timestamps: true });
const blogReactionSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },
    sessionId: {
        type: String,
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
}, { _id: false });
const blogPostSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
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
const BlogPost = mongoose_1.default.model('BlogPost', blogPostSchema);
exports.default = BlogPost;
//# sourceMappingURL=BlogPost.js.map