import mongoose, { Document, Schema, Model } from 'mongoose';

// Withdrawal Model
export interface IWithdrawal extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  amount: number;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  reference: string;
  withdrawalFee: number;
  netAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'rejected';
  
  // Paystack fields
  paystackRecipientCode?: string;
  paystackTransferCode?: string;
  
  // Status tracking
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  rejectedAt?: Date;
  
  // Admin tracking
  processedBy?: mongoose.Types.ObjectId;
  
  // Failure/Rejection info
  failureReason?: string;
  rejectionReason?: string;
  
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const withdrawalSchema = new Schema<IWithdrawal>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [1000, 'Minimum withdrawal is ₦1,000'],
    },
    bankName: {
      type: String,
      required: true,
    },
      bankCode: { 
        type: String, 
        required: true }, 
    accountNumber: {
      type: String,
      required: true,
    },
    accountName: {
      type: String,
      required: true,
    },
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    withdrawalFee: {
      type: Number,
      default: 100,
    },
    netAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'rejected'],
      default: 'pending',
      index: true,
    },
    paystackRecipientCode: String,
    paystackTransferCode: String,
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: Date,
    completedAt: Date,
    failedAt: Date,
    rejectedAt: Date,
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    failureReason: String,
    rejectionReason: String,
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
withdrawalSchema.index({ user: 1, createdAt: -1 });
withdrawalSchema.index({ status: 1, createdAt: -1 });
withdrawalSchema.index({ reference: 1 });

// Don't return deleted withdrawals
withdrawalSchema.pre(/^find/, function (next) {
  // @ts-ignore
  this.find({ isDeleted: { $ne: true } });
  next();
});

const Withdrawal: Model<IWithdrawal> = mongoose.model<IWithdrawal>(
  'Withdrawal',
  withdrawalSchema
);

export default Withdrawal;