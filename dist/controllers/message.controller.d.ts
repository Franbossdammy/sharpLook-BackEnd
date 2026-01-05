import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/message.types';
declare class MessageController {
    /**
     * Get user's conversations
     */
    getConversations(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get or create conversation
     */
    getOrCreateConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
    * Upload message attachment
    */
    uploadAttachment(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get conversation by ID
     */
    getConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Send a message - ENHANCED with Socket.IO broadcasting
     */
    sendMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get messages in a conversation
     */
    getMessages(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Mark message as read
     */
    markAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Mark all messages in conversation as read
     */
    markConversationAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Toggle reaction on a message
     */
    toggleReaction(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Delete a message
     */
    deleteMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Delete conversation
     */
    deleteConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get unread messages count
     */
    getUnreadCount(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Search messages
     */
    searchMessages(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
declare const _default: MessageController;
export default _default;
//# sourceMappingURL=message.controller.d.ts.map