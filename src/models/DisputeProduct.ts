import mongoose, { Document, Schema, Model } from 'mongoose';

export enum DisputeStatus {
  OPEN = 'open',
  UNDER_REVIEW = 'under_review',
  AWAITING_RESPONSE = 'awaiting_response',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum DisputeReason {
  PRODUCT_NOT_RECEIVED = 'product_not_received',
  PRODUCT_DAMAGED = 'product_damaged',
  WRONG_PRODUCT = 'wrong_product',
  PRODUCT_NOT_AS_DESCRIBED = 'product_not_as_described',
  QUALITY_ISSUE = 'quality_issue',
  DELIVERY_ISSUE = 'delivery_issue',
  PAYMENT_ISSUE = 'payment_issue',
  OTHER = 'other',
}

export enum DisputeResolution {
  FULL_REFUND = 'full_refund',
  PARTIAL_REFUND = 'partial_refund',
  REPLACEMENT = 'replacement',
  SELLER_WINS = 'seller_wins',
  CUSTOMER_WINS = 'customer_wins',
}

export interface IDisputeMessage {
  sender: mongoose.Types.ObjectId;
  senderRole: 'customer' | 'seller' | 'admin';
  message: string;
  attachments?: string[];
  createdAt: Date;
}

export interface IDispute extends Document {
  _id: mongoose.Types.ObjectId;
  disputeNumber: string;
  
  // Related entities
  order: mongoose.Types.ObjectId;
  product?: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  seller: mongoose.Types.ObjectId;
  
  // Dispute details
  reason: DisputeReason;
  description: string;
  evidence?: string[];
  
  // Status
  status: DisputeStatus;
  priority: 'low' | 'medium' | 'high';
  
  // Admin handling
  assignedTo?: mongoose.Types.ObjectId;
  assignedAt?: Date;
  
  // Communication
  messages: IDisputeMessage[];
  lastMessageAt?: Date;
  
  // Resolution
  resolution?: DisputeResolution;
  resolutionNote?: string;
  refundAmount?: number;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  
  // Closure
  closedBy?: mongoose.Types.ObjectId;
  closedAt?: Date;
  closureNote?: string;
  
  // Response tracking
  customerResponded: boolean;
  sellerResponded: boolean;
  lastResponseAt?: Date;
  
  // Metadata
  isEscalated: boolean;
  escalatedAt?: Date;
  escalatedReason?: string;
  
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  addMessage(senderId: string, senderRole: string, message: string, attachments?: string[]): Promise<void>;
  canBeResolved(): boolean;
  canBeClosed(): boolean;
}

const disputeSchema = new Schema<IDispute>(
  {
    disputeNumber: {
      type: String,
      required: false,
      unique: true,
      index: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order is required'],
      index: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer is required'],
      index: true,
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller is required'],
      index: true,
    },
    reason: {
      type: String,
      enum: Object.values(DisputeReason),
      required: [true, 'Dispute reason is required'],
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      minlength: [20, 'Description must be at least 20 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      trim: true,
    },
    evidence: [String],
    status: {
      type: String,
      enum: Object.values(DisputeStatus),
      default: DisputeStatus.OPEN,
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    assignedAt: Date,
    messages: [
      {
        sender: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        senderRole: {
          type: String,
          enum: ['customer', 'seller', 'admin'],
          required: true,
        },
        message: {
          type: String,
          required: [true, 'Message text is required'],
          minlength: [1, 'Message cannot be empty'],
          maxlength: [1000, 'Message cannot exceed 1000 characters'],
          trim: true,
        },
        attachments: [String],
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    lastMessageAt: Date,
    resolution: {
      type: String,
      enum: Object.values(DisputeResolution),
    },
    resolutionNote: {
      type: String,
      maxlength: [1000, 'Resolution note cannot exceed 1000 characters'],
      trim: true,
    },
    refundAmount: {
      type: Number,
      min: [0, 'Refund amount cannot be negative'],
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: Date,
    closedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    closedAt: Date,
    closureNote: {
      type: String,
      trim: true,
    },
    customerResponded: {
      type: Boolean,
      default: false,
    },
    sellerResponded: {
      type: Boolean,
      default: false,
    },
    lastResponseAt: Date,
    isEscalated: {
      type: Boolean,
      default: false,
      index: true,
    },
    escalatedAt: Date,
    escalatedReason: String,
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
disputeSchema.index({ disputeNumber: 1 }, { unique: true });
disputeSchema.index({ status: 1, createdAt: -1 });
disputeSchema.index({ customer: 1, status: 1 });
disputeSchema.index({ seller: 1, status: 1 });
disputeSchema.index({ assignedTo: 1, status: 1 });
disputeSchema.index({ priority: -1, createdAt: 1 });

// ✅ FIXED: Generate dispute number before save
disputeSchema.pre('save', async function(next) {
  if (this.isNew && !this.disputeNumber) {
    try {
      // Use this.constructor to reference the model safely
      const DisputeModel = this.constructor as Model<IDispute>;
      const count = await DisputeModel.countDocuments();
      const timestamp = Date.now();
      const paddedCount = (count + 1).toString().padStart(6, '0');
      this.disputeNumber = `DSP-${timestamp}-${paddedCount}`;
      console.log('✅ Generated dispute number:', this.disputeNumber);
    } catch (error) {
      console.error('❌ Error generating dispute number:', error);
      // Fallback: generate without count query
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      this.disputeNumber = `DSP-${timestamp}-${randomSuffix}`;
      console.log('⚠️ Used fallback dispute number:', this.disputeNumber);
    }
  }
  next();
});

// Method to add a message with validation
disputeSchema.methods.addMessage = async function(
  senderId: string,
  senderRole: string,
  message: string,
  attachments?: string[]
): Promise<void> {
  // Validate message
  const trimmedMessage = message.trim();
  
  if (!trimmedMessage) {
    throw new Error('Message cannot be empty');
  }
  
  if (trimmedMessage.length > 1000) {
    throw new Error('Message cannot exceed 1000 characters');
  }
  
  // Validate sender role
  if (!['customer', 'seller', 'admin'].includes(senderRole)) {
    throw new Error('Invalid sender role');
  }
  
  // Add the message
  this.messages.push({
    sender: mongoose.Types.ObjectId.createFromHexString(senderId),
    senderRole,
    message: trimmedMessage,
    attachments,
    createdAt: new Date(),
  });
  
  this.lastMessageAt = new Date();
  this.lastResponseAt = new Date();
  
  if (senderRole === 'customer') {
    this.customerResponded = true;
  } else if (senderRole === 'seller') {
    this.sellerResponded = true;
  }
  
  await this.save();
};

// Method to check if dispute can be resolved
disputeSchema.methods.canBeResolved = function(): boolean {
  return [
    DisputeStatus.OPEN,
    DisputeStatus.UNDER_REVIEW,
    DisputeStatus.AWAITING_RESPONSE,
  ].includes(this.status);
};

// Method to check if dispute can be closed
disputeSchema.methods.canBeClosed = function(): boolean {
  return this.status === DisputeStatus.RESOLVED;
};

// Don't return deleted disputes in queries by default
disputeSchema.pre(/^find/, function(next) {
  // @ts-ignore
  this.find({ isDeleted: { $ne: true } });
  next();
});

const Dispute: Model<IDispute> =
  mongoose.models.DisputeProduct ||
  mongoose.model<IDispute>('DisputeProduct', disputeSchema);

export default Dispute;