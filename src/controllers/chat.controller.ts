import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import chatService from '../services/chat.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';

class ChatController {
  public createOrGetConversation = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const { otherUserId, bookingId } = req.body;
      
      const conversation = await chatService.createOrGetConversation(
        userId,
        otherUserId,
        bookingId
      );
      
      return ResponseHandler.success(res, 'Conversation retrieved', { conversation });
    }
  );

  public sendMessage = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { conversationId } = req.params;
      const userId = req.user!.id;
      
      const message = await chatService.sendMessage(conversationId, userId, req.body);
      
      // Emit socket event would happen here via socket service
      
      return ResponseHandler.created(res, 'Message sent', { message });
    }
  );

  public markAsRead = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { conversationId } = req.params;
      const userId = req.user!.id;
      
      await chatService.markAsRead(conversationId, userId);
      
      return ResponseHandler.success(res, 'Messages marked as read');
    }
  );

  public getUserConversations = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await chatService.getUserConversations(userId, page, limit);
      
      return ResponseHandler.paginated(
        res,
        'Conversations retrieved',
        result.conversations,
        page,
        limit,
        result.total
      );
    }
  );

  public getConversationMessages = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { conversationId } = req.params;
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const result = await chatService.getConversationMessages(
        conversationId,
        userId,
        page,
        limit
      );
      
      return ResponseHandler.paginated(
        res,
        'Messages retrieved',
        result.messages,
        page,
        limit,
        result.total
      );
    }
  );

  public deleteMessage = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { messageId } = req.params;
      const userId = req.user!.id;
      
      await chatService.deleteMessage(messageId, userId);
      
      return ResponseHandler.success(res, 'Message deleted');
    }
  );

  public getUnreadCount = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      
      const count = await chatService.getUnreadCount(userId);
      
      return ResponseHandler.success(res, 'Unread count retrieved', { count });
    }
  );

  public searchMessages = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const { query } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await chatService.searchMessages(
        userId,
        query as string,
        page,
        limit
      );
      
      return ResponseHandler.paginated(
        res,
        'Messages found',
        result.messages,
        page,
        limit,
        result.total
      );
    }
  );

  public archiveConversation = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { conversationId } = req.params;
      const userId = req.user!.id;
      
      await chatService.archiveConversation(conversationId, userId);
      
      return ResponseHandler.success(res, 'Conversation archived');
    }
  );
}

export default new ChatController();
