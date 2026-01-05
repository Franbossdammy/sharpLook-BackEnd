import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IReview extends Document {
  _id: mongoose.Types.ObjectId;
  booking: mongoose.Types.ObjectId;
  reviewer: mongoose.Types.ObjectId;
  reviewee: mongoose.Types.ObjectId;
  reviewerType: 'client' | 'vendor';
  
  // Rating (1-5 stars)
  rating: number;
  
  // Review content
  title?: string;
  comment: string;
  
  // Detailed ratings (for vendor reviews)
  detailedRatings?: {
    serviceQuality?: number;
    communication?: number;
    punctuality?: number;
    professionalism?: number;
    valueForMoney?: number;
  };
  
  // Media
  images?: string[];
  
  // Response
  response?: {
    comment: string;
    respondedAt: Date;
  };
  
  // Engagement
  helpfulCount: number;
  notHelpfulCount: number;
  helpfulVotes: mongoose.Types.ObjectId[];
  
  // Moderation
  isApproved: boolean;
  isFlagged: boolean;
  flagReason?: string;
  flaggedBy?: mongoose.Types.ObjectId;
  flaggedAt?: Date;
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  moderationNotes?: string;
  
  // Status
  isHidden: boolean;
  hiddenReason?: string;
  
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking is required'],
      index: true,
    },
    reviewer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewer is required'],
      index: true,
    },
    reviewee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewee is required'],
      index: true,
    },
    reviewerType: {
      type: String,
      enum: ['client', 'vendor'],
      required: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    comment: {
      type: String,
      required: [true, 'Comment is required'],
      trim: true,
      minlength: [10, 'Comment must be at least 10 characters'],
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    detailedRatings: {
      serviceQuality: {
        type: Number,
        min: 1,
        max: 5,
      },
      communication: {
        type: Number,
        min: 1,
        max: 5,
      },
      punctuality: {
        type: Number,
        min: 1,
        max: 5,
      },
      professionalism: {
        type: Number,
        min: 1,
        max: 5,
      },
      valueForMoney: {
        type: Number,
        min: 1,
        max: 5,
      },
    },
    images: [String],
    response: {
      comment: {
        type: String,
        trim: true,
        maxlength: [500, 'Response cannot exceed 500 characters'],
      },
      respondedAt: Date,
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
    notHelpfulCount: {
      type: Number,
      default: 0,
    },
    helpfulVotes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isApproved: {
      type: Boolean,
      default: true,
    },
    isFlagged: {
      type: Boolean,
      default: false,
      index: true,
    },
    flagReason: String,
    flaggedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    flaggedAt: Date,
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    moderatedAt: Date,
    moderationNotes: String,
    isHidden: {
      type: Boolean,
      default: false,
    },
    hiddenReason: String,
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
reviewSchema.index({ booking: 1 }, { unique: true });
reviewSchema.index({ reviewer: 1, createdAt: -1 });
reviewSchema.index({ reviewee: 1, rating: -1 });
reviewSchema.index({ reviewee: 1, isApproved: 1, isHidden: 1 });
reviewSchema.index({ rating: -1, createdAt: -1 });
reviewSchema.index({ isFlagged: 1, isApproved: 1 });

// Virtual for net helpful votes
reviewSchema.virtual('netHelpfulVotes').get(function () {
  return this.helpfulCount - this.notHelpfulCount;
});

// Don't return deleted reviews in queries by default
reviewSchema.pre(/^find/, function (next) {
  // @ts-ignore
  this.find({ isDeleted: { $ne: true } });
  next();
});

const Review: Model<IReview> = mongoose.model<IReview>('Review', reviewSchema);

export default Review;
