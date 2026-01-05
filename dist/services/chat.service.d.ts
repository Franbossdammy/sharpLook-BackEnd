import { IConversation } from '../models/Conversation';
import { IMessage } from '../models/Message';
declare class ChatService {
    /**
     * Create or get conversation
     */
    createOrGetConversation(userId: string, otherUserId: string, bookingId?: string): Promise<IConversation>;
    /**
     * Send message
     */
    sendMessage(conversationId: string, senderId: string, data: {
        text?: string;
        messageType?: 'text' | 'image' | 'file' | 'audio' | 'video';
        attachments?: any[];
    }): Promise<IMessage>;
    /**
     * Mark messages as read
     */
    markAsRead(conversationId: string, userId: string): Promise<void>;
    /**
     * Mark message as delivered
     */
    markAsDelivered(messageId: string): Promise<void>;
    /**
     * Get user conversations
     */
    getUserConversations(userId: string, page?: number, limit?: number): Promise<{
        conversations: IConversation[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get conversation messages
     */
    getConversationMessages(conversationId: string, userId: string, page?: number, limit?: number): Promise<{
        messages: IMessage[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Delete message
     */
    deleteMessage(messageId: string, userId: string): Promise<void>;
    /**
     * Get unread message count
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
    /**
     * Archive conversation
     */
    archiveConversation(conversationId: string, userId: string): Promise<void>;
}
declare const _default: ChatService;
export default _default;
//# sourceMappingURL=chat.service.d.ts.map