import {  Response, NextFunction } from 'express';
import messageService from '../services/message.service';
import ResponseHandler from '../utils/response';
import { AuthRequest } from '../types/message.types';
import { uploadToCloudinary } from '../utils/cloudinary';
import { BadRequestError } from '../utils/errors';


class MessageController {
  /**
   * Get user's conversations
   */
  public async getConversations(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await messageService.getUserConversations(userId, page, limit);

      ResponseHandler.paginated(
        res,
        'Conversations retrieved successfully',
        result.conversations,
        result.page,
        limit,
        result.total
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get or create conversation
   */
  public async getOrCreateConversation(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { otherUserId } = req.params;

      const conversation = await messageService.getOrCreateConversation(userId, otherUserId);

      ResponseHandler.success(res, 'Conversation retrieved successfully', conversation);
    } catch (error) {
      next(error);
    }
  }

 /**
 * Upload message attachment
 */
public async uploadAttachment(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      throw new BadRequestError('No file uploaded');
    }

    console.log('📁 Processing file:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    // Get file type from mimetype
    let fileType: 'image' | 'video' | 'audio' | 'file' = 'file';
    
    // ⭐ IMPORTANT: Handle React Native FormData bug where m4a is sent as image/m4a
    const isAudioFile = req.file.mimetype.startsWith('audio/') || 
                        req.file.mimetype === 'image/m4a' ||
                        req.file.originalname.endsWith('.m4a') ||
                        req.file.originalname.endsWith('.mp3') ||
                        req.file.originalname.endsWith('.wav');
    
    if (isAudioFile) {
      fileType = 'audio';
      console.log('🎤 Detected as audio file');
    } else if (req.file.mimetype.startsWith('image/')) {
      fileType = 'image';
      console.log('🖼️ Detected as image file');
    } else if (req.file.mimetype.startsWith('video/')) {
      fileType = 'video';
      console.log('🎥 Detected as video file');
    } else {
      console.log('📄 Detected as document file');
    }

    // Determine cloudinary resource type
    let resourceType: 'image' | 'video' | 'raw' = 'raw';
    if (fileType === 'image') {
      resourceType = 'image';
    } else if (fileType === 'video' || fileType === 'audio') {
      resourceType = 'video'; // Cloudinary uses 'video' for both video and audio
    }

    console.log('📤 Uploading to Cloudinary:', {
      fileType,
      resourceType,
      folder: 'message-attachments',
    });

    // Upload to cloudinary
    const uploadedUrl = await uploadToCloudinary(req.file.buffer, {
      folder: 'message-attachments',
      resource_type: resourceType,
    });

    console.log('✅ Upload successful:', uploadedUrl);

    ResponseHandler.success(
      res,
      'File uploaded successfully',
      {
        url: uploadedUrl,
        type: fileType,
        name: req.file.originalname,
        size: req.file.size,
      }
    );
  } catch (error) {
    console.error('❌ Upload error:', error);
    next(error);
  }
}

  /**
   * Get conversation by ID
   */
  public async getConversation(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { conversationId } = req.params;

      const conversation = await messageService.getConversationById(conversationId, userId);

      ResponseHandler.success(res, 'Conversation retrieved successfully', conversation);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send a message - ENHANCED with Socket.IO broadcasting
   */
  public async sendMessage(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const senderId = req.user!._id.toString();
      const { receiverId, messageType, text, attachments, replyTo } = req.body;

      console.log('📥 HTTP message:send received');
      console.log('   From:', senderId);
      console.log('   To:', receiverId);
      console.log('   Type:', messageType);
      console.log('   Text:', text?.substring(0, 50));

      const result = await messageService.sendMessage(senderId, receiverId, {
        messageType,
        text,
        attachments,
        replyTo,
      });

      console.log('💾 Message saved via HTTP');
      console.log('   Message ID:', result.message._id);
      console.log('   Conversation ID:', result.conversation._id);

      // ✅ CRITICAL: Broadcast via Socket.IO for real-time updates
      try {
        const conversationId = result.conversation._id.toString();
        const room = `conversation:${conversationId}`;
        
        console.log('📤 Broadcasting message:received via HTTP controller');
        console.log('   To room:', room);
        
        // Get socket service instance
        const socketService = require('../socket/socket.service').default;
        const io = socketService.getIO();
        
        // Check room size
        const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
        console.log('   Room size:', roomSize);
        console.log('   Room members:', Array.from(io.sockets.adapter.rooms.get(room) || []));
        
        // Broadcast to conversation room (INCLUDING SENDER for real-time update)
        io.to(room).emit('message:received', {
          message: result.message,
          conversationId: conversationId,
        });
        
        console.log('✅ message:received broadcast complete via HTTP');
        
        // Also send notification to receiver's personal room
        io.to(`user:${receiverId}`).emit('message:new', {
          message: result.message,
          conversation: result.conversation,
        });
        
        console.log('✅ message:new notification sent to receiver');
      } catch (socketError) {
        console.error('❌ Error broadcasting via socket:', socketError);
        // Don't fail the request if socket broadcast fails
      }

      ResponseHandler.created(res, 'Message sent successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get messages in a conversation
   */
  public async getMessages(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { conversationId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await messageService.getMessages(conversationId, userId, page, limit);

      ResponseHandler.paginated(
        res,
        'Messages retrieved successfully',
        result.messages,
        result.page,
        limit,
        result.total
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark message as read
   */
  public async markAsRead(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { messageId } = req.params;

      const message = await messageService.markAsRead(messageId, userId);

      ResponseHandler.success(res, 'Message marked as read', message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark all messages in conversation as read
   */
  public async markConversationAsRead(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { conversationId } = req.params;

      await messageService.markConversationAsRead(conversationId, userId);

      ResponseHandler.success(res, 'All messages marked as read', null);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle reaction on a message
   */
  public async toggleReaction(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { messageId } = req.params;
      const { emoji } = req.body;

      const message = await messageService.toggleReaction(messageId, userId, emoji);

      ResponseHandler.success(res, 'Reaction toggled successfully', message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a message
   */
  public async deleteMessage(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { messageId } = req.params;

      await messageService.deleteMessage(messageId, userId);

      ResponseHandler.success(res, 'Message deleted successfully', null);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete conversation
   */
  public async deleteConversation(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { conversationId } = req.params;

      await messageService.deleteConversation(conversationId, userId);

      ResponseHandler.success(res, 'Conversation deleted successfully', null);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get unread messages count
   */
  public async getUnreadCount(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!._id.toString();

      const count = await messageService.getUnreadCount(userId);

      ResponseHandler.success(res, 'Unread count retrieved successfully', { unreadCount: count });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search messages
   */
  public async searchMessages(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { query } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!query || typeof query !== 'string') {
        ResponseHandler.badRequest(res, 'Search query is required');
        return;
      }

      const result = await messageService.searchMessages(userId, query, page, limit);

      ResponseHandler.paginated(
        res,
        'Messages searched successfully',
        result.messages,
        result.page,
        limit,
        result.total
      );
    } catch (error) {
      next(error);
    }
  }
}

export default new MessageController();