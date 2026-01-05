import { IMessage } from '../models/Message';
import { IConversation } from '../models/Conversation';
declare class MessageService {
    /**
     * Get or create conversation between two users
     */
    getOrCreateConversation(user1Id: string, user2Id: string): Promise<IConversation>;
    /**
     * Get user's conversations with pagination
     */
    getUserConversations(userId: string, page?: number, limit?: number): Promise<{
        conversations: IConversation[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get conversation by ID
     */
    getConversationById(conversationId: string, userId: string): Promise<IConversation>;
    /**
     * Send a message
     */
    sendMessage(senderId: string, receiverId: string, data: {
        messageType: 'text' | 'image' | 'file' | 'audio' | 'video';
        text?: string;
        attachments?: Array<{
            url: string;
            type: 'image' | 'file' | 'audio' | 'video';
            name?: string;
            size?: number;
        }>;
        replyTo?: string;
    }): Promise<{
        message: IMessage;
        conversation: IConversation;
    }>;
    /**
     * Get messages in a conversation
     */
    getMessages(conversationId: string, userId: string, page?: number, limit?: number): Promise<{
        messages: IMessage[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Mark message as delivered
     */
    markAsDelivered(messageId: string, userId: string): Promise<IMessage>;
    /**
     * Mark message as read
     */
    markAsRead(messageId: string, userId: string): Promise<IMessage>;
    /**
     * Mark all messages in conversation as read
     */
    markConversationAsRead(conversationId: string, userId: string): Promise<void>;
    /**
     * Add or update reaction to a message
     */
    toggleReaction(messageId: string, userId: string, emoji: string): Promise<IMessage>;
    /**
     * Delete a message
     */
    deleteMessage(messageId: string, userId: string): Promise<void>;
    /**
     * Delete conversation
     */
    deleteConversation(conversationId: string, userId: string): Promise<void>;
    /**
     * Get unread messages count for user
     */
    getUnreadCount(userId: string): Promise<number>;
    /**
     * Search messages
     */
    searchMessages(userId: string, query: string, page?: number, limit?: number): Promise<{
        messages: IMessage[];
        total: number;
        page: number;
        totalPages: number;
    }>;
}
declare const _default: MessageService;
export default _default;
//# sourceMappingURL=message.service.d.ts.map