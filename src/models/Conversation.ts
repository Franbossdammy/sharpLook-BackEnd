import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  booking?: mongoose.Types.ObjectId;
  
  // Last message info
  lastMessage?: {
    text: string;
    sender: mongoose.Types.ObjectId;
    sentAt: Date;
  };
  
  // Unread counts per participant
  unreadCount: Map<string, number>;
  
  // Status
  isActive: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
    lastMessage: {
      text: String,
      sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      sentAt: Date,
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
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
conversationSchema.index({ participants: 1 });
conversationSchema.index({ booking: 1 });
conversationSchema.index({ 'lastMessage.sentAt': -1 });
conversationSchema.index({ isActive: 1, updatedAt: -1 });

// Ensure participants array has exactly 2 users
conversationSchema.pre('save', function (next) {
  if (this.participants.length !== 2) {
    throw new Error('Conversation must have exactly 2 participants');
  }
  next();
});

// Don't return deleted conversations in queries by default
conversationSchema.pre(/^find/, function (next) {
  // @ts-ignore
  this.find({ isDeleted: { $ne: true } });
  next();
});

const Conversation: Model<IConversation> = mongoose.model<IConversation>(
  'Conversation',
  conversationSchema
);

export default Conversation;
