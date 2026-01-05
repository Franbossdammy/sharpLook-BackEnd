import mongoose, { Document, Model } from 'mongoose';
export interface IConversation extends Document {
    _id: mongoose.Types.ObjectId;
    participants: mongoose.Types.ObjectId[];
    booking?: mongoose.Types.ObjectId;
    lastMessage?: {
        text: string;
        sender: mongoose.Types.ObjectId;
        sentAt: Date;
    };
    unreadCount: Map<string, number>;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    isDeleted: boolean;
    deletedAt?: Date;
}
declare const Conversation: Model<IConversation>;
export default Conversation;
//# sourceMappingURL=Conversation.d.ts.map