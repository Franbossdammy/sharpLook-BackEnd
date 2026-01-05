import { Request } from 'express';
import { Types } from 'mongoose';
import { UserRole } from './index';
export interface AuthRequest extends Request {
    user?: {
        _id: Types.ObjectId;
        id: string;
        email: string;
        role: UserRole;
        isVendor?: boolean;
    };
    file?: Express.Multer.File;
    files?: Express.Multer.File[] | {
        [fieldname: string]: Express.Multer.File[];
    };
}
export interface MessageAttachment {
    url: string;
    type: 'image' | 'file' | 'audio' | 'video';
    name?: string;
    size?: number;
}
export interface MessageReaction {
    user: Types.ObjectId;
    emoji: string;
    createdAt: Date;
}
export interface SendMessageData {
    receiverId: string;
    messageType: 'text' | 'image' | 'file' | 'audio' | 'video';
    text?: string;
    attachments?: MessageAttachment[];
    replyTo?: string;
}
export interface SocketAuthData {
    token: string;
}
export interface TypingData {
    conversationId: string;
    userId: string;
}
export interface MessageStatusData {
    messageId: string;
    status: 'delivered' | 'read';
    deliveredAt?: Date;
    readAt?: Date;
}
export interface UserStatusData {
    userId: string;
    isOnline: boolean;
    lastSeen?: Date;
}
export declare enum MessageSocketEvent {
    JOIN_CONVERSATION = "join:conversation",
    LEAVE_CONVERSATION = "leave:conversation",
    JOINED_CONVERSATION = "joined:conversation",
    MESSAGE_SEND = "message:send",
    MESSAGE_SENT = "message:sent",
    MESSAGE_NEW = "message:new",
    MESSAGE_RECEIVED = "message:received",
    MESSAGE_DELIVERED = "message:delivered",
    MESSAGE_READ = "message:read",
    MESSAGE_STATUS = "message:status",
    MESSAGE_DELETE = "message:delete",
    MESSAGE_DELETED = "message:deleted",
    MESSAGE_REACT = "message:react",
    MESSAGE_REACTION = "message:reaction",
    TYPING_START = "typing:start",
    TYPING_STOP = "typing:stop",
    USER_STATUS = "user:status",
    USER_STATUS_REQUEST = "user:status:request",
    USER_STATUS_RESPONSE = "user:status:response",
    CONVERSATION_READ = "conversation:read",
    ERROR = "error"
}
//# sourceMappingURL=message.types.d.ts.map