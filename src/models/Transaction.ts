import mongoose, { Document, Schema, Model } from 'mongoose';
import { TransactionType, PaymentStatus } from '../types';

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: PaymentStatus;
  reference: string;
  description: string;
  
  // Related entities
  booking?: mongoose.Types.ObjectId;
    order?: mongoose.Types.ObjectId;      // ADD THIS LINE

  payment?: mongoose.Types.ObjectId;
  withdrawal?: mongoose.Types.ObjectId;
  
  // Metadata
  metadata?: any;
  
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: [true, 'Transaction type is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.COMPLETED,
      index: true,
    },
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
     order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    payment: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
    },
    withdrawal: {
      type: Schema.Types.ObjectId,
      ref: 'Withdrawal',
    },
    metadata: Schema.Types.Mixed,
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
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ reference: 1 }, { unique: true });
transactionSchema.index({ booking: 1 });
transactionSchema.index({ order: 1 });
transactionSchema.index({ payment: 1 });

// Don't return deleted transactions in queries by default
transactionSchema.pre(/^find/, function (next) {
  // @ts-ignore
  this.find({ isDeleted: { $ne: true } });
  next();
});

const Transaction: Model<ITransaction> = mongoose.model<ITransaction>(
  'Transaction',
  transactionSchema
);

export default Transaction;
