import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config';
import logger from '../utils/logger';
import messageService from '../services/message.service';
import userService from '../services/user.service';
import callService from '../services/call.service';
import Message from '../models/Message';
import Conversation from '../models/Conversation';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

// Helper to create a call message in the conversation
async function createCallMessage(
  callerId: string,
  receiverId: string,
  callType: 'voice' | 'video',
  callStatus: 'missed' | 'completed' | 'rejected' | 'cancelled',
  duration?: number,
  io?: Server,
) {
  try {
    // Find or create conversation between caller and receiver
    let conversation = await Conversation.findOne({
      participants: { $all: [callerId, receiverId] },
    });

    if (!conversation) return;

    const message = await Message.create({
      conversation: conversation._id,
      sender: callerId,
      receiver: receiverId,
      messageType: 'call',
      text: callStatus === 'missed' ? 'Missed call' : callStatus === 'rejected' ? 'Declined call' : callStatus === 'cancelled' ? 'Cancelled call' : 'Call ended',
      callInfo: { type: callType, status: callStatus, duration },
    });

    // Update conversation's last message
    conversation.lastMessage = {
      text: message.text || 'Call',
      sender: message.sender,
      sentAt: new Date(),
    };
    conversation.updatedAt = new Date();
    await conversation.save();

    // Populate and broadcast to both participants
    const populated = await message.populate([
      { path: 'sender', select: 'firstName lastName avatar' },
      { path: 'receiver', select: 'firstName lastName avatar' },
    ]);

    const msgObj = populated.toObject();
    if (io) {
      io.to(`user:${callerId}`).emit('message:new', { message: msgObj, conversationId: conversation._id.toString() });
      io.to(`user:${receiverId}`).emit('message:new', { message: msgObj, conversationId: conversation._id.toString() });
    }

    console.log('📝 Call message created:', callStatus, 'in conversation:', conversation._id);
  } catch (err) {
    console.error('❌ Failed to create call message:', err);
  }
}

const onlineUsers = new Map<string, string[]>();
const typingUsers = new Map<string, Set<string>>();

class SocketService {
  private io: Server | null = null;

  public initialize(httpServer: HTTPServer): Server {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*',
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, config.jwt.secret) as any;
        socket.userId = decoded.userId || decoded.id;
        socket.user = decoded;

        console.log('🔐 Socket authenticated:', socket.userId);
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Invalid authentication token'));
      }
    });

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });

    logger.info('Socket.IO initialized successfully');

    return this.io;
  }

  // ADD THESE METHODS TO YOUR EXISTING socket.service.ts (at the bottom, before the export)

// ============================================
// WALLET EVENT METHODS - Add these to SocketService class
// ============================================

/**
 * Emit wallet funded event to user
 */
public emitWalletFunded(userId: string, data: {
  reference: string;
  amount: number;
  newBalance: number;
}): void {
  if (this.io) {
    console.log('💰 Emitting wallet:funded to user:', userId);
    console.log('   Reference:', data.reference);
    console.log('   Amount:', data.amount);
    console.log('   New Balance:', data.newBalance);

    this.io.to(`user:${userId}`).emit('wallet:funded', {
      ...data,
      message: 'Wallet funded successfully',
      timestamp: new Date().toISOString(),
    });

    console.log('✅ wallet:funded event emitted');
  }
}

/**
 * Emit wallet funding failed event to user
 */
public emitWalletFundingFailed(userId: string, data: {
  reference: string;
  reason?: string;
}): void {
  if (this.io) {
    console.log('❌ Emitting wallet:funding:failed to user:', userId);
    console.log('   Reference:', data.reference);

    this.io.to(`user:${userId}`).emit('wallet:funding:failed', {
      ...data,
      message: data.reason || 'Wallet funding failed',
      timestamp: new Date().toISOString(),
    });

    console.log('✅ wallet:funding:failed event emitted');
  }
}

/**
 * Emit withdrawal success event to user
 */
public emitWithdrawalSuccess(userId: string, data: {
  reference: string;
  amount: number;
  newBalance: number;
}): void {
  if (this.io) {
    console.log('💸 Emitting withdrawal:success to user:', userId);

    this.io.to(`user:${userId}`).emit('withdrawal:success', {
      ...data,
      message: 'Withdrawal processed successfully',
      timestamp: new Date().toISOString(),
    });

    console.log('✅ withdrawal:success event emitted');
  }
}

/**
 * Emit withdrawal failed event to user
 */
public emitWithdrawalFailed(userId: string, data: {
  reference: string;
  reason?: string;
}): void {
  if (this.io) {
    console.log('❌ Emitting withdrawal:failed to user:', userId);

    this.io.to(`user:${userId}`).emit('withdrawal:failed', {
      ...data,
      message: data.reason || 'Withdrawal failed',
      timestamp: new Date().toISOString(),
    });

    console.log('✅ withdrawal:failed event emitted');
  }
}

/**
 * Emit generic payment event to user
 */
public emitPaymentEvent(userId: string, event: string, data: any): void {
  if (this.io) {
    console.log(`💳 Emitting ${event} to user:`, userId);
    this.io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
    console.log(`✅ ${event} event emitted`);
  }
}

  private handleConnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;
    console.log('✅ User connected:', userId, '(Socket:', socket.id + ')');
    logger.info(`User connected: ${userId} (Socket: ${socket.id})`);

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, []);
    }
    onlineUsers.get(userId)!.push(socket.id);

    userService.updateOnlineStatus(userId, true).catch((err: any) => {
      logger.error('Error updating online status:', err);
    });

    this.broadcastUserStatus(userId, true);
    socket.join(`user:${userId}`);

    socket.on('join:conversation', async (conversationId: string) => {
      try {
        console.log('📥 join:conversation received');
        console.log('   User:', userId);
        console.log('   Conversation:', conversationId);

        await messageService.getConversationById(conversationId, userId);
        socket.join(`conversation:${conversationId}`);
        
        const roomSize = this.io!.sockets.adapter.rooms.get(`conversation:${conversationId}`)?.size || 0;
        
        console.log('✅ User joined conversation');
        console.log('   Room:', `conversation:${conversationId}`);
        console.log('   Room size:', roomSize);
        
        logger.info(`User ${userId} joined conversation ${conversationId}`);

        socket.emit('joined:conversation', { conversationId });
      } catch (error: any) {
        console.error('❌ Error joining conversation:', error.message);
        logger.error('Error joining conversation:', error);
        socket.emit('error', { message: error.message || 'Failed to join conversation' });
      }
    });

    socket.on('leave:conversation', (conversationId: string) => {
      console.log('📥 leave:conversation received');
      console.log('   User:', userId);
      console.log('   Conversation:', conversationId);

      socket.leave(`conversation:${conversationId}`);
      logger.info(`User ${userId} left conversation ${conversationId}`);
    });

    socket.on('message:send', async (data: {
      receiverId: string;
      messageType: 'text' | 'image' | 'file' | 'audio' | 'video';
      text?: string;
      attachments?: any[];
      replyTo?: string;
    }) => {
      try {
        console.log('📥 message:send received');
        console.log('   From:', userId);
        console.log('   To:', data.receiverId);
        console.log('   Type:', data.messageType);
        console.log('   Text:', data.text?.substring(0, 50));

        const result = await messageService.sendMessage(userId, data.receiverId, data);

        console.log('💾 Message saved to database');
        console.log('   Message ID:', result.message._id);
        console.log('   Conversation ID:', result.conversation._id);

        const conversationId = result.conversation._id.toString();
        const room = `conversation:${conversationId}`;
        const roomSize = this.io!.sockets.adapter.rooms.get(room)?.size || 0;

        console.log('📤 Broadcasting message:received');
        console.log('   To room:', room);
        console.log('   Room size:', roomSize);
        console.log('   Room members:', Array.from(this.io!.sockets.adapter.rooms.get(room) || []));

        this.io!.to(room).emit('message:received', {
          message: result.message,
          conversationId: conversationId,
        });

        console.log('✅ message:received broadcast complete');

        socket.emit('message:sent', {
          message: result.message,
          conversation: result.conversation,
        });

        console.log('✅ message:sent acknowledgment sent to sender');

        this.io!.to(`user:${data.receiverId}`).emit('message:new', {
          message: result.message,
          conversation: result.conversation,
        });

        console.log('✅ message:new notification sent to receiver');

        logger.info(`Message sent from ${userId} to ${data.receiverId}`);
      } catch (error: any) {
        console.error('❌ Error sending message:', error.message);
        logger.error('Error sending message:', error);
        socket.emit('error', { message: error.message || 'Failed to send message' });
      }
    });

    socket.on('message:delivered', async (messageId: string) => {
      try {
        console.log('📥 message:delivered received');
        console.log('   Message ID:', messageId);
        console.log('   User:', userId);

        const message = await messageService.markAsDelivered(messageId, userId);

        this.io!.to(`user:${message.sender.toString()}`).emit('message:status', {
          messageId,
          status: 'delivered',
          deliveredAt: message.deliveredAt,
        });

        console.log('✅ Delivered status broadcast to sender');
        logger.info(`Message ${messageId} marked as delivered by ${userId}`);
      } catch (error: any) {
        console.error('❌ Error marking message as delivered:', error.message);
        logger.error('Error marking message as delivered:', error);
      }
    });

    socket.on('message:read', async (messageId: string) => {
      try {
        console.log('📥 message:read received');
        console.log('   Message ID:', messageId);
        console.log('   User:', userId);

        const message = await messageService.markAsRead(messageId, userId);

        this.io!.to(`user:${message.sender.toString()}`).emit('message:status', {
          messageId,
          status: 'read',
          readAt: message.readAt,
        });

        console.log('✅ Read status broadcast to sender');
        logger.info(`Message ${messageId} marked as read by ${userId}`);
      } catch (error: any) {
        console.error('❌ Error marking message as read:', error.message);
        logger.error('Error marking message as read:', error);
      }
    });

    socket.on('conversation:read', async (conversationId: string) => {
      try {
        console.log('📥 conversation:read received');
        console.log('   Conversation ID:', conversationId);
        console.log('   User:', userId);

        await messageService.markConversationAsRead(conversationId, userId);

        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          const otherUserId = conversation.participants.find(
            (p) => p.toString() !== userId
          )?.toString();

          if (otherUserId) {
            this.io!.to(`user:${otherUserId}`).emit('conversation:read', {
              conversationId,
              readBy: userId,
            });

            console.log('✅ Conversation read status sent to:', otherUserId);
          }
        }

        logger.info(`Conversation ${conversationId} marked as read by ${userId}`);
      } catch (error: any) {
        console.error('❌ Error marking conversation as read:', error.message);
        logger.error('Error marking conversation as read:', error);
      }
    });

    socket.on('typing:start', async (conversationId: string) => {
      try {
        console.log('📥 typing:start received');
        console.log('   User:', userId);
        console.log('   Conversation:', conversationId);

        await messageService.getConversationById(conversationId, userId);

        if (!typingUsers.has(conversationId)) {
          typingUsers.set(conversationId, new Set());
        }
        typingUsers.get(conversationId)!.add(userId);

        const room = `conversation:${conversationId}`;
        const roomSize = this.io!.sockets.adapter.rooms.get(room)?.size || 0;

        console.log('📤 Broadcasting typing:start');
        console.log('   To room:', room);
        console.log('   Room size:', roomSize);

        socket.to(room).emit('typing:start', {
          conversationId,
          userId,
        });

        console.log('✅ typing:start broadcast complete');
        logger.info(`User ${userId} started typing in conversation ${conversationId}`);
      } catch (error: any) {
        console.error('❌ Error handling typing start:', error.message);
        logger.error('Error handling typing start:', error);
      }
    });

    socket.on('typing:stop', async (conversationId: string) => {
      try {
        console.log('📥 typing:stop received');
        console.log('   User:', userId);
        console.log('   Conversation:', conversationId);

        if (typingUsers.has(conversationId)) {
          typingUsers.get(conversationId)!.delete(userId);
        }

        const room = `conversation:${conversationId}`;

        console.log('📤 Broadcasting typing:stop');
        console.log('   To room:', room);

        socket.to(room).emit('typing:stop', {
          conversationId,
          userId,
        });

        console.log('✅ typing:stop broadcast complete');
        logger.info(`User ${userId} stopped typing in conversation ${conversationId}`);
      } catch (error: any) {
        console.error('❌ Error handling typing stop:', error.message);
        logger.error('Error handling typing stop:', error);
      }
    });

    socket.on('recording:start', async (conversationId: string) => {
      try {
        console.log('📥 recording:start received');
        console.log('   User:', userId);
        console.log('   Conversation:', conversationId);

        await messageService.getConversationById(conversationId, userId);

        const room = `conversation:${conversationId}`;
        const roomSize = this.io!.sockets.adapter.rooms.get(room)?.size || 0;

        console.log('📤 Broadcasting recording:start');
        console.log('   To room:', room);
        console.log('   Room size:', roomSize);

        socket.to(room).emit('recording:start', {
          conversationId,
          userId,
        });

        console.log('✅ recording:start broadcast complete');
        logger.info(`User ${userId} started recording in conversation ${conversationId}`);
      } catch (error: any) {
        console.error('❌ Error handling recording start:', error.message);
        logger.error('Error handling recording start:', error);
      }
    });

    socket.on('recording:stop', async (conversationId: string) => {
      try {
        console.log('📥 recording:stop received');
        console.log('   User:', userId);
        console.log('   Conversation:', conversationId);

        const room = `conversation:${conversationId}`;

        console.log('📤 Broadcasting recording:stop');
        console.log('   To room:', room);

        socket.to(room).emit('recording:stop', {
          conversationId,
          userId,
        });

        console.log('✅ recording:stop broadcast complete');
        logger.info(`User ${userId} stopped recording in conversation ${conversationId}`);
      } catch (error: any) {
        console.error('❌ Error handling recording stop:', error.message);
        logger.error('Error handling recording stop:', error);
      }
    });

    socket.on('uploading:start', async (conversationId: string) => {
      try {
        console.log('📥 uploading:start received');
        console.log('   User:', userId);
        console.log('   Conversation:', conversationId);

        await messageService.getConversationById(conversationId, userId);

        const room = `conversation:${conversationId}`;
        const roomSize = this.io!.sockets.adapter.rooms.get(room)?.size || 0;

        console.log('📤 Broadcasting uploading:start');
        console.log('   To room:', room);
        console.log('   Room size:', roomSize);

        socket.to(room).emit('uploading:start', {
          conversationId,
          userId,
        });

        console.log('✅ uploading:start broadcast complete');
        logger.info(`User ${userId} started uploading in conversation ${conversationId}`);
      } catch (error: any) {
        console.error('❌ Error handling uploading start:', error.message);
        logger.error('Error handling uploading start:', error);
      }
    });

    socket.on('uploading:stop', async (conversationId: string) => {
      try {
        console.log('📥 uploading:stop received');
        console.log('   User:', userId);
        console.log('   Conversation:', conversationId);

        const room = `conversation:${conversationId}`;

        console.log('📤 Broadcasting uploading:stop');
        console.log('   To room:', room);

        socket.to(room).emit('uploading:stop', {
          conversationId,
          userId,
        });

        console.log('✅ uploading:stop broadcast complete');
        logger.info(`User ${userId} stopped uploading in conversation ${conversationId}`);
      } catch (error: any) {
        console.error('❌ Error handling uploading stop:', error.message);
        logger.error('Error handling uploading stop:', error);
      }
    });

    socket.on('message:react', async (data: { messageId: string; emoji: string }) => {
      try {
        console.log('📥 message:react received');
        console.log('   Message ID:', data.messageId);
        console.log('   Emoji:', data.emoji);
        console.log('   User:', userId);

        const message = await messageService.toggleReaction(data.messageId, userId, data.emoji);

        const conversationId = message.conversation.toString();
        this.io!.to(`conversation:${conversationId}`).emit('message:reaction', {
          messageId: data.messageId,
          reactions: (message as any).reactions,
        });

        console.log('✅ Reaction broadcast to conversation');
        logger.info(`User ${userId} reacted to message ${data.messageId} with ${data.emoji}`);
      } catch (error: any) {
        console.error('❌ Error toggling reaction:', error.message);
        logger.error('Error toggling reaction:', error);
        socket.emit('error', { message: error.message || 'Failed to add reaction' });
      }
    });

    socket.on('message:delete', async (messageId: string) => {
      try {
        console.log('📥 message:delete received');
        console.log('   Message ID:', messageId);
        console.log('   User:', userId);

        const message = await Message.findById(messageId);
        if (!message) {
          throw new Error('Message not found');
        }

        const conversationId = message.conversation.toString();

        await messageService.deleteMessage(messageId, userId);

        this.io!.to(`conversation:${conversationId}`).emit('message:deleted', {
          messageId,
          deletedBy: userId,
        });

        console.log('✅ Message deletion broadcast to conversation');
        logger.info(`Message ${messageId} deleted by ${userId}`);
      } catch (error: any) {
        console.error('❌ Error deleting message:', error.message);
        logger.error('Error deleting message:', error);
        socket.emit('error', { message: error.message || 'Failed to delete message' });
      }
    });

    socket.on('user:status:request', (userIds: string[]) => {
      console.log('📥 user:status:request received');
      console.log('   Requested users:', userIds);

      const statuses = userIds.map((id) => ({
        userId: id,
        isOnline: onlineUsers.has(id),
      }));

      socket.emit('user:status:response', statuses);

      console.log('✅ User status response sent:', statuses);
    });

  socket.on('call:initiate', async (data: {
  receiverId: string;
  type: 'voice' | 'video';
  offer?: any;
  conversationId?: string;
}) => {
  try {
    console.log('📞 call:initiate received');
    console.log('   Caller:', userId);
    console.log('   Receiver:', data.receiverId);
    console.log('   Type from request:', data.type);

    const call = await callService.createCall(userId, data.receiverId, data.type);

    console.log('📞 Call created in database');
    console.log('   Call ID:', call._id);
    console.log('   Type in database:', call.type);

    // Check if receiver is actually connected via socket
    const receiverRoom = this.io!.sockets.adapter.rooms.get(`user:${data.receiverId}`);
    const receiverConnected = receiverRoom && receiverRoom.size > 0;
    console.log('📞 Receiver socket status:');
    console.log('   Room user:' + data.receiverId, receiverConnected ? `CONNECTED (${receiverRoom!.size} sockets)` : 'NOT CONNECTED');

    // Prepare clean serializable data to send (avoid Mongoose document issues)
    const callObj = call.toObject ? call.toObject() : call;
    const incomingCallData = {
      call: {
        _id: callObj._id?.toString(),
        type: callObj.type,
        status: callObj.status,
        caller: {
          _id: (callObj.caller?._id || callObj.caller)?.toString(),
          firstName: callObj.caller?.firstName || '',
          lastName: callObj.caller?.lastName || '',
          avatar: callObj.caller?.avatar || '',
        },
        receiver: {
          _id: (callObj.receiver?._id || callObj.receiver)?.toString(),
          firstName: callObj.receiver?.firstName || '',
          lastName: callObj.receiver?.lastName || '',
          avatar: callObj.receiver?.avatar || '',
        },
      },
      caller: {
        _id: (callObj.caller?._id || callObj.caller)?.toString(),
        firstName: callObj.caller?.firstName || '',
        lastName: callObj.caller?.lastName || '',
        avatar: callObj.caller?.avatar || '',
      },
      type: callObj.type,
      conversationId: data.conversationId,
    };

    console.log('📤 Emitting call:incoming to receiver:', data.receiverId);
    console.log('📤 Payload size:', JSON.stringify(incomingCallData).length, 'bytes');

    // Send call:incoming via socket
    this.io!.to(`user:${data.receiverId}`).emit('call:incoming', incomingCallData);

    socket.emit('call:initiated', { call: callObj });
    logger.info(`Call ${call._id} initiated from ${userId} to ${data.receiverId}, type: ${call.type}`);

    // If receiver is NOT connected via socket, send a push notification as fallback
    if (!receiverConnected) {
      console.log('⚠️ Receiver not connected via socket, sending push notification');
      try {
        const notificationService = require('../services/notification.service').default;
        const { NotificationType } = require('../types');
        await notificationService.createNotification({
          userId: data.receiverId,
          type: NotificationType.INCOMING_CALL,
          title: 'Incoming Call',
          message: `${(call.caller as any).firstName || 'Someone'} ${(call.caller as any).lastName || ''} is calling you`,
          channels: { push: true, inApp: true },
          data: { type: 'call', callId: (call._id as any).toString(), callType: call.type },
        });
      } catch (pushErr: any) {
        console.error('❌ Failed to send call push notification:', pushErr.message);
      }
    }

    // Forward offer via proper signaling channel after a small delay
    if (data.offer) {
      setTimeout(() => {
        console.log('📞 Forwarding initial offer to receiver:', data.receiverId);
        this.io!.to(`user:${data.receiverId}`).emit('call:signal:offer', {
          callId: (call._id as any).toString(),
          offer: data.offer,
          senderId: userId,
        });
        logger.info(`Offer forwarded for call ${call._id}`);
      }, 500);
    }
  } catch (error: any) {
    logger.error('Error initiating call:', error);
    socket.emit('error', { message: error.message || 'Failed to initiate call' });
  }
});

    socket.on('call:accept', async (data: { callId: string; answer: any }) => {
      try {
        const call = await callService.updateCallStatus(data.callId, 'accepted');
        
        this.io!.to(`user:${call.caller.toString()}`).emit('call:accepted', {
          call: call,
          answer: data.answer,
        });
        
        socket.emit('call:accepted:ack', { call: call });
        logger.info(`Call ${data.callId} accepted by ${userId}`);
      } catch (error: any) {
        logger.error('Error accepting call:', error);
        socket.emit('error', { message: error.message || 'Failed to accept call' });
      }
    });

    socket.on('call:reject', async (data: { callId: string } | string) => {
      try {
        const callId = typeof data === 'string' ? data : data.callId;

        const call = await callService.rejectCall(callId);

        this.io!.to(`user:${call.caller.toString()}`).emit('call:rejected', { call: call });
        logger.info(`Call ${callId} rejected by ${userId}`);

        await createCallMessage(call.caller.toString(), call.receiver.toString(), call.type || 'voice', 'rejected', undefined, this.io!);
      } catch (error: any) {
        logger.error('Error rejecting call:', error);
        socket.emit('error', { message: error.message || 'Failed to reject call' });
      }
    });

socket.on('call:end', async (data: { callId: string } | string) => {
  try {
    const callId = typeof data === 'string' ? data : data.callId;
    
    console.log('📞 [Backend] Ending call:', callId);
    console.log('   Ended by user:', userId);
    
    const call = await callService.endCall(callId);
    
    console.log('✅ Call ended in database');
    console.log('   Caller:', call.caller.toString());
    console.log('   Receiver:', call.receiver.toString());
    
    // Get both participant IDs
    const callerId = call.caller.toString();
    const receiverId = call.receiver.toString();
    
    const eventData = {
      call: call,
      callId: callId,
      endedBy: userId,
    };

    console.log('📤 Broadcasting call:ended to BOTH parties');
    
    // ✅ CRITICAL: Emit to BOTH participants
    this.io!.to(`user:${callerId}`).emit('call:ended', eventData);
    console.log('   ✅ Emitted to caller:', callerId);
    
    this.io!.to(`user:${receiverId}`).emit('call:ended', eventData);
    console.log('   ✅ Emitted to receiver:', receiverId);
    
    // Send acknowledgment to the person who ended the call
    socket.emit('call:ended:ack', { call: call });
    
    console.log('✅ [Backend] call:ended broadcast complete');
    logger.info(`Call ${callId} ended by ${userId}`);

    // Create call message in conversation
    const duration = call.duration || (call.startedAt ? Math.round((new Date().getTime() - new Date(call.startedAt).getTime()) / 1000) : undefined);
    await createCallMessage(callerId, receiverId, call.type || 'voice', 'completed', duration, this.io!);
  } catch (error: any) {
    console.error('❌ Error ending call:', error);
    logger.error('Error ending call:', error);
    socket.emit('error', { message: error.message || 'Failed to end call' });
  }
});
   
socket.on('call:cancel', async (data: { callId: string } | string) => {
  try {
    const callId = typeof data === 'string' ? data : data.callId;
    
    console.log('📞 [Backend] Cancelling call:', callId);
    console.log('   Cancelled by user:', userId);
    
    const call = await callService.cancelCall(callId);
    
    // Get both participant IDs
    const callerId = call.caller.toString();
    const receiverId = call.receiver.toString();
    
    const eventData = {
      call: call,
      callId: callId,
      cancelledBy: userId,
    };

    console.log('📤 Broadcasting call:cancelled to BOTH parties');
    
    // ✅ Emit to BOTH participants
    this.io!.to(`user:${callerId}`).emit('call:cancelled', eventData);
    console.log('   ✅ Emitted to caller:', callerId);
    
    this.io!.to(`user:${receiverId}`).emit('call:cancelled', eventData);
    console.log('   ✅ Emitted to receiver:', receiverId);
    
    console.log('✅ [Backend] call:cancelled broadcast complete');
    logger.info(`Call ${callId} cancelled by ${userId}`);

    await createCallMessage(callerId, receiverId, call.type || 'voice', 'cancelled', undefined, this.io!);
  } catch (error: any) {
    console.error('❌ Error cancelling call:', error);
    logger.error('Error cancelling call:', error);
    socket.emit('error', { message: error.message || 'Failed to cancel call' });
  }
});
    socket.on('call:busy', async (data: { callId: string } | string) => {
      try {
        const callId = typeof data === 'string' ? data : data.callId;
        
        const call = await callService.updateCallStatus(callId, 'busy');
        
        this.io!.to(`user:${call.caller.toString()}`).emit('call:busy', { call: call });
        logger.info(`Call ${callId} marked as busy by ${userId}`);
      } catch (error: any) {
        logger.error('Error marking call as busy:', error);
        socket.emit('error', { message: error.message || 'Failed to mark call as busy' });
      }
    });

    socket.on('call:missed', async (data: { callId: string } | string) => {
      try {
        const callId = typeof data === 'string' ? data : data.callId;

        const call = await callService.markCallAsMissed(callId);

        this.io!.to(`user:${call.caller.toString()}`).emit('call:missed', { call: call });
        this.io!.to(`user:${call.receiver.toString()}`).emit('call:missed', { call: call });
        logger.info(`Call ${callId} marked as missed`);

        await createCallMessage(call.caller.toString(), call.receiver.toString(), call.type || 'voice', 'missed', undefined, this.io!);
      } catch (error: any) {
        logger.error('Error marking call as missed:', error);
      }
    });

    // ✅ WebRTC Signaling Handlers - ADDED
    socket.on('call:signal:offer', (data: {
      callId: string;
      receiverId: string;
      offer: any;
    }) => {
      try {
        console.log('📞 Forwarding offer to receiver:', data.receiverId);
        console.log('   Call ID:', data.callId);
        
        this.io!.to(`user:${data.receiverId}`).emit('call:signal:offer', {
          callId: data.callId,
          offer: data.offer,
          senderId: userId,
        });
        
        logger.info(`Offer forwarded for call ${data.callId} from ${userId} to ${data.receiverId}`);
      } catch (error: any) {
        logger.error('Error forwarding offer:', error);
      }
    });

    socket.on('call:signal:answer', (data: {
      callId: string;
      callerId: string;
      answer: any;
    }) => {
      try {
        console.log('📞 Forwarding answer to caller:', data.callerId);
        console.log('   Call ID:', data.callId);
        
        this.io!.to(`user:${data.callerId}`).emit('call:signal:answer', {
          callId: data.callId,
          answer: data.answer,
          senderId: userId,
        });
        
        logger.info(`Answer forwarded for call ${data.callId} from ${userId} to ${data.callerId}`);
      } catch (error: any) {
        logger.error('Error forwarding answer:', error);
      }
    });

    socket.on('call:signal:ice', (data: {
      callId: string;
      receiverId: string;
      candidate: any;
    }) => {
      try {
        console.log('📞 Forwarding ICE candidate to:', data.receiverId);
        console.log('   Call ID:', data.callId);
        
        this.io!.to(`user:${data.receiverId}`).emit('call:signal:ice', {
          callId: data.callId,
          candidate: data.candidate,
          senderId: userId,
        });
        
        logger.info(`ICE candidate forwarded for call ${data.callId}`);
      } catch (error: any) {
        logger.error('Error forwarding ICE candidate:', error);
      }
    });

    socket.on('call:ice-candidate', (data: {
      callId: string;
      candidate: any;
      targetUserId: string;
    }) => {
      try {
        this.io!.to(`user:${data.targetUserId}`).emit('call:ice-candidate', {
          callId: data.callId,
          candidate: data.candidate,
          fromUserId: userId,
        });
      } catch (error: any) {
        logger.error('Error forwarding ICE candidate:', error);
      }
    });

    socket.on('call:toggle-video', (data: {
      callId: string;
      videoEnabled: boolean;
      targetUserId: string;
    }) => {
      try {
        this.io!.to(`user:${data.targetUserId}`).emit('call:video-toggled', {
          callId: data.callId,
          videoEnabled: data.videoEnabled,
          userId: userId,
        });
        logger.info(`User ${userId} toggled video to ${data.videoEnabled} in call ${data.callId}`);
      } catch (error: any) {
        logger.error('Error toggling video:', error);
      }
    });

    socket.on('call:toggle-audio', (data: {
      callId: string;
      audioEnabled: boolean;
      targetUserId: string;
    }) => {
      try {
        this.io!.to(`user:${data.targetUserId}`).emit('call:audio-toggled', {
          callId: data.callId,
          audioEnabled: data.audioEnabled,
          userId: userId,
        });
        logger.info(`User ${userId} toggled audio to ${data.audioEnabled} in call ${data.callId}`);
      } catch (error: any) {
        logger.error('Error toggling audio:', error);
      }
    });

    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });

    socket.onAny((eventName, ...args) => {
      console.log('📡 Socket event:', eventName, args);
    });
  }

  private handleDisconnect(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;
    console.log('🔴 User disconnected:', userId, '(Socket:', socket.id + ')');
    logger.info(`User disconnected: ${userId} (Socket: ${socket.id})`);

    if (onlineUsers.has(userId)) {
      const sockets = onlineUsers.get(userId)!;
      const index = sockets.indexOf(socket.id);
      if (index > -1) {
        sockets.splice(index, 1);
      }

      if (sockets.length === 0) {
        onlineUsers.delete(userId);

        console.log('👤 User now offline:', userId);

        userService.setUserOffline(userId).catch((err: any) => {
          logger.error('Error updating offline status:', err);
        });

        this.broadcastUserStatus(userId, false);
      }
    }

    typingUsers.forEach((users, conversationId) => {
      if (users.has(userId)) {
        users.delete(userId);
        this.io!.to(`conversation:${conversationId}`).emit('typing:stop', {
          conversationId,
          userId,
        });
      }
    });
  }

  private broadcastUserStatus(userId: string, isOnline: boolean): void {
    console.log('📤 Broadcasting user status');
    console.log('   User:', userId);
    console.log('   Status:', isOnline ? 'online' : 'offline');

    this.io!.emit('user:status', {
      userId,
      isOnline,
      lastSeen: new Date(),
    });

    console.log('✅ User status broadcast complete');
  }

  public getIO(): Server {
    if (!this.io) {
      throw new Error('Socket.IO not initialized. Call initialize() first.');
    }
    return this.io;
  }

  public sendToUser(userId: string, event: string, data: any): void {
    if (this.io) {
      console.log('📤 Sending to user:', userId, 'Event:', event);
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  public sendToConversation(conversationId: string, event: string, data: any): void {
    if (this.io) {
      console.log('📤 Sending to conversation:', conversationId, 'Event:', event);
      this.io.to(`conversation:${conversationId}`).emit(event, data);
    }
  }

  public isUserOnline(userId: string): boolean {
    return onlineUsers.has(userId);
  }

  public getOnlineUsersCount(): number {
    return onlineUsers.size;
  }
}

export default new SocketService();