import mongoose, { Document, Model } from 'mongoose';
export declare enum BlogPostStatus {
    DRAFT = "draft",
    PENDING = "pending",
    PUBLISHED = "published",
    HIDDEN = "hidden",
    REJECTED = "rejected"
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
    metaTitle?: string;
    metaDescription?: string;
    keywords: string[];
    canonicalUrl?: string;
    category: string;
    tags: string[];
    status: BlogPostStatus;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    rejectionReason?: string;
    publishedAt?: Date;
    views: number;
    reactions: IBlogReaction[];
    comments: IBlogComment[];
    likesCount: number;
    commentsCount: number;
    isFeatured: boolean;
    isDeleted: boolean;
    deletedAt?: Date;
    deletedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const BlogPost: Model<IBlogPost>;
export default BlogPost;
//# sourceMappingURL=BlogPost.d.ts.map