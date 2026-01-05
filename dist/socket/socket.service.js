"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../utils/logger"));
const message_service_1 = __importDefault(require("../services/message.service"));
const user_service_1 = __importDefault(require("../services/user.service"));
const call_service_1 = __importDefault(require("../services/call.service"));
const Message_1 = __importDefault(require("../models/Message"));
const Conversation_1 = __importDefault(require("../models/Conversation"));
const onlineUsers = new Map();
const typingUsers = new Map();
class SocketService {
    constructor() {
        this.io = null;
    }
    initialize(httpServer) {
        this.io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: config_1.default.urls.frontend,
                credentials: true,
            },
            pingTimeout: 60000,
            pingInterval: 25000,
        });
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
                if (!token) {
                    return next(new Error('Authentication token required'));
                }
                const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwt.secret);
                socket.userId = decoded.userId || decoded.id;
                socket.user = decoded;
                console.log('🔐 Socket authenticated:', socket.userId);
                next();
            }
            catch (error) {
                logger_1.default.error('Socket authentication error:', error);
                next(new Error('Invalid authentication token'));
            }
        });
        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });
        logger_1.default.info('Socket.IO initialized successfully');
        return this.io;
    }
    // ADD THESE METHODS TO YOUR EXISTING socket.service.ts (at the bottom, before the export)
    // ============================================
    // WALLET EVENT METHODS - Add these to SocketService class
    // ============================================
    /**
     * Emit wallet funded event to user
     */
    emitWalletFunded(userId, data) {
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
    emitWalletFundingFailed(userId, data) {
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
    emitWithdrawalSuccess(userId, data) {
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
    emitWithdrawalFailed(userId, data) {
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
    emitPaymentEvent(userId, event, data) {
        if (this.io) {
            console.log(`💳 Emitting ${event} to user:`, userId);
            this.io.to(`user:${userId}`).emit(event, {
                ...data,
                timestamp: new Date().toISOString(),
            });
            console.log(`✅ ${event} event emitted`);
        }
    }
    handleConnection(socket) {
        const userId = socket.userId;
        console.log('✅ User connected:', userId, '(Socket:', socket.id + ')');
        logger_1.default.info(`User connected: ${userId} (Socket: ${socket.id})`);
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, []);
        }
        onlineUsers.get(userId).push(socket.id);
        user_service_1.default.updateOnlineStatus(userId, true).catch((err) => {
            logger_1.default.error('Error updating online status:', err);
        });
        this.broadcastUserStatus(userId, true);
        socket.join(`user:${userId}`);
        socket.on('join:conversation', async (conversationId) => {
            try {
                console.log('📥 join:conversation received');
                console.log('   User:', userId);
                console.log('   Conversation:', conversationId);
                await message_service_1.default.getConversationById(conversationId, userId);
                socket.join(`conversation:${conversationId}`);
                const roomSize = this.io.sockets.adapter.rooms.get(`conversation:${conversationId}`)?.size || 0;
                console.log('✅ User joined conversation');
                console.log('   Room:', `conversation:${conversationId}`);
                console.log('   Room size:', roomSize);
                logger_1.default.info(`User ${userId} joined conversation ${conversationId}`);
                socket.emit('joined:conversation', { conversationId });
            }
            catch (error) {
                console.error('❌ Error joining conversation:', error.message);
                logger_1.default.error('Error joining conversation:', error);
                socket.emit('error', { message: error.message || 'Failed to join conversation' });
            }
        });
        socket.on('leave:conversation', (conversationId) => {
            console.log('📥 leave:conversation received');
            console.log('   User:', userId);
            console.log('   Conversation:', conversationId);
            socket.leave(`conversation:${conversationId}`);
            logger_1.default.info(`User ${userId} left conversation ${conversationId}`);
        });
        socket.on('message:send', async (data) => {
            try {
                console.log('📥 message:send received');
                console.log('   From:', userId);
                console.log('   To:', data.receiverId);
                console.log('   Type:', data.messageType);
                console.log('   Text:', data.text?.substring(0, 50));
                const result = await message_service_1.default.sendMessage(userId, data.receiverId, data);
                console.log('💾 Message saved to database');
                console.log('   Message ID:', result.message._id);
                console.log('   Conversation ID:', result.conversation._id);
                const conversationId = result.conversation._id.toString();
                const room = `conversation:${conversationId}`;
                const roomSize = this.io.sockets.adapter.rooms.get(room)?.size || 0;
                console.log('📤 Broadcasting message:received');
                console.log('   To room:', room);
                console.log('   Room size:', roomSize);
                console.log('   Room members:', Array.from(this.io.sockets.adapter.rooms.get(room) || []));
                this.io.to(room).emit('message:received', {
                    message: result.message,
                    conversationId: conversationId,
                });
                console.log('✅ message:received broadcast complete');
                socket.emit('message:sent', {
                    message: result.message,
                    conversation: result.conversation,
                });
                console.log('✅ message:sent acknowledgment sent to sender');
                this.io.to(`user:${data.receiverId}`).emit('message:new', {
                    message: result.message,
                    conversation: result.conversation,
                });
                console.log('✅ message:new notification sent to receiver');
                logger_1.default.info(`Message sent from ${userId} to ${data.receiverId}`);
            }
            catch (error) {
                console.error('❌ Error sending message:', error.message);
                logger_1.default.error('Error sending message:', error);
                socket.emit('error', { message: error.message || 'Failed to send message' });
            }
        });
        socket.on('message:delivered', async (messageId) => {
            try {
                console.log('📥 message:delivered received');
                console.log('   Message ID:', messageId);
                console.log('   User:', userId);
                const message = await message_service_1.default.markAsDelivered(messageId, userId);
                this.io.to(`user:${message.sender.toString()}`).emit('message:status', {
                    messageId,
                    status: 'delivered',
                    deliveredAt: message.deliveredAt,
                });
                console.log('✅ Delivered status broadcast to sender');
                logger_1.default.info(`Message ${messageId} marked as delivered by ${userId}`);
            }
            catch (error) {
                console.error('❌ Error marking message as delivered:', error.message);
                logger_1.default.error('Error marking message as delivered:', error);
            }
        });
        socket.on('message:read', async (messageId) => {
            try {
                console.log('📥 message:read received');
                console.log('   Message ID:', messageId);
                console.log('   User:', userId);
                const message = await message_service_1.default.markAsRead(messageId, userId);
                this.io.to(`user:${message.sender.toString()}`).emit('message:status', {
                    messageId,
                    status: 'read',
                    readAt: message.readAt,
                });
                console.log('✅ Read status broadcast to sender');
                logger_1.default.info(`Message ${messageId} marked as read by ${userId}`);
            }
            catch (error) {
                console.error('❌ Error marking message as read:', error.message);
                logger_1.default.error('Error marking message as read:', error);
            }
        });
        socket.on('conversation:read', async (conversationId) => {
            try {
                console.log('📥 conversation:read received');
                console.log('   Conversation ID:', conversationId);
                console.log('   User:', userId);
                await message_service_1.default.markConversationAsRead(conversationId, userId);
                const conversation = await Conversation_1.default.findById(conversationId);
                if (conversation) {
                    const otherUserId = conversation.participants.find((p) => p.toString() !== userId)?.toString();
                    if (otherUserId) {
                        this.io.to(`user:${otherUserId}`).emit('conversation:read', {
                            conversationId,
                            readBy: userId,
                        });
                        console.log('✅ Conversation read status sent to:', otherUserId);
                    }
                }
                logger_1.default.info(`Conversation ${conversationId} marked as read by ${userId}`);
            }
            catch (error) {
                console.error('❌ Error marking conversation as read:', error.message);
                logger_1.default.error('Error marking conversation as read:', error);
            }
        });
        socket.on('typing:start', async (conversationId) => {
            try {
                console.log('📥 typing:start received');
                console.log('   User:', userId);
                console.log('   Conversation:', conversationId);
                await message_service_1.default.getConversationById(conversationId, userId);
                if (!typingUsers.has(conversationId)) {
                    typingUsers.set(conversationId, new Set());
                }
                typingUsers.get(conversationId).add(userId);
                const room = `conversation:${conversationId}`;
                const roomSize = this.io.sockets.adapter.rooms.get(room)?.size || 0;
                console.log('📤 Broadcasting typing:start');
                console.log('   To room:', room);
                console.log('   Room size:', roomSize);
                socket.to(room).emit('typing:start', {
                    conversationId,
                    userId,
                });
                console.log('✅ typing:start broadcast complete');
                logger_1.default.info(`User ${userId} started typing in conversation ${conversationId}`);
            }
            catch (error) {
                console.error('❌ Error handling typing start:', error.message);
                logger_1.default.error('Error handling typing start:', error);
            }
        });
        socket.on('typing:stop', async (conversationId) => {
            try {
                console.log('📥 typing:stop received');
                console.log('   User:', userId);
                console.log('   Conversation:', conversationId);
                if (typingUsers.has(conversationId)) {
                    typingUsers.get(conversationId).delete(userId);
                }
                const room = `conversation:${conversationId}`;
                console.log('📤 Broadcasting typing:stop');
                console.log('   To room:', room);
                socket.to(room).emit('typing:stop', {
                    conversationId,
                    userId,
                });
                console.log('✅ typing:stop broadcast complete');
                logger_1.default.info(`User ${userId} stopped typing in conversation ${conversationId}`);
            }
            catch (error) {
                console.error('❌ Error handling typing stop:', error.message);
                logger_1.default.error('Error handling typing stop:', error);
            }
        });
        socket.on('recording:start', async (conversationId) => {
            try {
                console.log('📥 recording:start received');
                console.log('   User:', userId);
                console.log('   Conversation:', conversationId);
                await message_service_1.default.getConversationById(conversationId, userId);
                const room = `conversation:${conversationId}`;
                const roomSize = this.io.sockets.adapter.rooms.get(room)?.size || 0;
                console.log('📤 Broadcasting recording:start');
                console.log('   To room:', room);
                console.log('   Room size:', roomSize);
                socket.to(room).emit('recording:start', {
                    conversationId,
                    userId,
                });
                console.log('✅ recording:start broadcast complete');
                logger_1.default.info(`User ${userId} started recording in conversation ${conversationId}`);
            }
            catch (error) {
                console.error('❌ Error handling recording start:', error.message);
                logger_1.default.error('Error handling recording start:', error);
            }
        });
        socket.on('recording:stop', async (conversationId) => {
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
                logger_1.default.info(`User ${userId} stopped recording in conversation ${conversationId}`);
            }
            catch (error) {
                console.error('❌ Error handling recording stop:', error.message);
                logger_1.default.error('Error handling recording stop:', error);
            }
        });
        socket.on('uploading:start', async (conversationId) => {
            try {
                console.log('📥 uploading:start received');
                console.log('   User:', userId);
                console.log('   Conversation:', conversationId);
                await message_service_1.default.getConversationById(conversationId, userId);
                const room = `conversation:${conversationId}`;
                const roomSize = this.io.sockets.adapter.rooms.get(room)?.size || 0;
                console.log('📤 Broadcasting uploading:start');
                console.log('   To room:', room);
                console.log('   Room size:', roomSize);
                socket.to(room).emit('uploading:start', {
                    conversationId,
                    userId,
                });
                console.log('✅ uploading:start broadcast complete');
                logger_1.default.info(`User ${userId} started uploading in conversation ${conversationId}`);
            }
            catch (error) {
                console.error('❌ Error handling uploading start:', error.message);
                logger_1.default.error('Error handling uploading start:', error);
            }
        });
        socket.on('uploading:stop', async (conversationId) => {
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
                logger_1.default.info(`User ${userId} stopped uploading in conversation ${conversationId}`);
            }
            catch (error) {
                console.error('❌ Error handling uploading stop:', error.message);
                logger_1.default.error('Error handling uploading stop:', error);
            }
        });
        socket.on('message:react', async (data) => {
            try {
                console.log('📥 message:react received');
                console.log('   Message ID:', data.messageId);
                console.log('   Emoji:', data.emoji);
                console.log('   User:', userId);
                const message = await message_service_1.default.toggleReaction(data.messageId, userId, data.emoji);
                const conversationId = message.conversation.toString();
                this.io.to(`conversation:${conversationId}`).emit('message:reaction', {
                    messageId: data.messageId,
                    reactions: message.reactions,
                });
                console.log('✅ Reaction broadcast to conversation');
                logger_1.default.info(`User ${userId} reacted to message ${data.messageId} with ${data.emoji}`);
            }
            catch (error) {
                console.error('❌ Error toggling reaction:', error.message);
                logger_1.default.error('Error toggling reaction:', error);
                socket.emit('error', { message: error.message || 'Failed to add reaction' });
            }
        });
        socket.on('message:delete', async (messageId) => {
            try {
                console.log('📥 message:delete received');
                console.log('   Message ID:', messageId);
                console.log('   User:', userId);
                const message = await Message_1.default.findById(messageId);
                if (!message) {
                    throw new Error('Message not found');
                }
                const conversationId = message.conversation.toString();
                await message_service_1.default.deleteMessage(messageId, userId);
                this.io.to(`conversation:${conversationId}`).emit('message:deleted', {
                    messageId,
                    deletedBy: userId,
                });
                console.log('✅ Message deletion broadcast to conversation');
                logger_1.default.info(`Message ${messageId} deleted by ${userId}`);
            }
            catch (error) {
                console.error('❌ Error deleting message:', error.message);
                logger_1.default.error('Error deleting message:', error);
                socket.emit('error', { message: error.message || 'Failed to delete message' });
            }
        });
        socket.on('user:status:request', (userIds) => {
            console.log('📥 user:status:request received');
            console.log('   Requested users:', userIds);
            const statuses = userIds.map((id) => ({
                userId: id,
                isOnline: onlineUsers.has(id),
            }));
            socket.emit('user:status:response', statuses);
            console.log('✅ User status response sent:', statuses);
        });
        socket.on('call:initiate', async (data) => {
            try {
                console.log('📞 call:initiate received');
                console.log('   Caller:', userId);
                console.log('   Receiver:', data.receiverId);
                console.log('   Type from request:', data.type); // ⚠️ Should be 'video'
                const call = await call_service_1.default.createCall(userId, data.receiverId, data.type);
                console.log('📞 Call created in database');
                console.log('   Call ID:', call._id);
                console.log('   Type in database:', call.type); // ⚠️ Should also be 'video'
                console.log('   Full call object:', JSON.stringify(call, null, 2));
                // ✅ Prepare the data to send
                const incomingCallData = {
                    call: call,
                    caller: call.caller,
                    type: call.type, // ✅ Use call.type from database
                    conversationId: data.conversationId,
                };
                console.log('📤 Emitting call:incoming to receiver');
                console.log('   To user:', data.receiverId);
                console.log('   Data being sent:', JSON.stringify(incomingCallData, null, 2));
                // ✅ Send call:incoming
                this.io.to(`user:${data.receiverId}`).emit('call:incoming', incomingCallData);
                socket.emit('call:initiated', { call: call });
                logger_1.default.info(`Call ${call._id} initiated from ${userId} to ${data.receiverId}, type: ${call.type}`);
                // ✅ Forward offer via proper signaling channel after a small delay
                if (data.offer) {
                    setTimeout(() => {
                        console.log('📞 Forwarding initial offer to receiver:', data.receiverId);
                        this.io.to(`user:${data.receiverId}`).emit('call:signal:offer', {
                            callId: call._id.toString(),
                            offer: data.offer,
                            senderId: userId,
                        });
                        logger_1.default.info(`Offer forwarded for call ${call._id}`);
                    }, 500);
                }
            }
            catch (error) {
                logger_1.default.error('Error initiating call:', error);
                socket.emit('error', { message: error.message || 'Failed to initiate call' });
            }
        });
        socket.on('call:accept', async (data) => {
            try {
                const call = await call_service_1.default.updateCallStatus(data.callId, 'accepted');
                this.io.to(`user:${call.caller.toString()}`).emit('call:accepted', {
                    call: call,
                    answer: data.answer,
                });
                socket.emit('call:accepted:ack', { call: call });
                logger_1.default.info(`Call ${data.callId} accepted by ${userId}`);
            }
            catch (error) {
                logger_1.default.error('Error accepting call:', error);
                socket.emit('error', { message: error.message || 'Failed to accept call' });
            }
        });
        socket.on('call:reject', async (data) => {
            try {
                const callId = typeof data === 'string' ? data : data.callId;
                const call = await call_service_1.default.rejectCall(callId);
                this.io.to(`user:${call.caller.toString()}`).emit('call:rejected', { call: call });
                logger_1.default.info(`Call ${callId} rejected by ${userId}`);
            }
            catch (error) {
                logger_1.default.error('Error rejecting call:', error);
                socket.emit('error', { message: error.message || 'Failed to reject call' });
            }
        });
        socket.on('call:end', async (data) => {
            try {
                const callId = typeof data === 'string' ? data : data.callId;
                console.log('📞 [Backend] Ending call:', callId);
                console.log('   Ended by user:', userId);
                const call = await call_service_1.default.endCall(callId);
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
                this.io.to(`user:${callerId}`).emit('call:ended', eventData);
                console.log('   ✅ Emitted to caller:', callerId);
                this.io.to(`user:${receiverId}`).emit('call:ended', eventData);
                console.log('   ✅ Emitted to receiver:', receiverId);
                // Send acknowledgment to the person who ended the call
                socket.emit('call:ended:ack', { call: call });
                console.log('✅ [Backend] call:ended broadcast complete');
                logger_1.default.info(`Call ${callId} ended by ${userId}`);
            }
            catch (error) {
                console.error('❌ Error ending call:', error);
                logger_1.default.error('Error ending call:', error);
                socket.emit('error', { message: error.message || 'Failed to end call' });
            }
        });
        socket.on('call:cancel', async (data) => {
            try {
                const callId = typeof data === 'string' ? data : data.callId;
                console.log('📞 [Backend] Cancelling call:', callId);
                console.log('   Cancelled by user:', userId);
                const call = await call_service_1.default.cancelCall(callId);
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
                this.io.to(`user:${callerId}`).emit('call:cancelled', eventData);
                console.log('   ✅ Emitted to caller:', callerId);
                this.io.to(`user:${receiverId}`).emit('call:cancelled', eventData);
                console.log('   ✅ Emitted to receiver:', receiverId);
                console.log('✅ [Backend] call:cancelled broadcast complete');
                logger_1.default.info(`Call ${callId} cancelled by ${userId}`);
            }
            catch (error) {
                console.error('❌ Error cancelling call:', error);
                logger_1.default.error('Error cancelling call:', error);
                socket.emit('error', { message: error.message || 'Failed to cancel call' });
            }
        });
        socket.on('call:busy', async (data) => {
            try {
                const callId = typeof data === 'string' ? data : data.callId;
                const call = await call_service_1.default.updateCallStatus(callId, 'busy');
                this.io.to(`user:${call.caller.toString()}`).emit('call:busy', { call: call });
                logger_1.default.info(`Call ${callId} marked as busy by ${userId}`);
            }
            catch (error) {
                logger_1.default.error('Error marking call as busy:', error);
                socket.emit('error', { message: error.message || 'Failed to mark call as busy' });
            }
        });
        socket.on('call:missed', async (data) => {
            try {
                const callId = typeof data === 'string' ? data : data.callId;
                const call = await call_service_1.default.markCallAsMissed(callId);
                this.io.to(`user:${call.caller.toString()}`).emit('call:missed', { call: call });
                this.io.to(`user:${call.receiver.toString()}`).emit('call:missed', { call: call });
                logger_1.default.info(`Call ${callId} marked as missed`);
            }
            catch (error) {
                logger_1.default.error('Error marking call as missed:', error);
            }
        });
        // ✅ WebRTC Signaling Handlers - ADDED
        socket.on('call:signal:offer', (data) => {
            try {
                console.log('📞 Forwarding offer to receiver:', data.receiverId);
                console.log('   Call ID:', data.callId);
                this.io.to(`user:${data.receiverId}`).emit('call:signal:offer', {
                    callId: data.callId,
                    offer: data.offer,
                    senderId: userId,
                });
                logger_1.default.info(`Offer forwarded for call ${data.callId} from ${userId} to ${data.receiverId}`);
            }
            catch (error) {
                logger_1.default.error('Error forwarding offer:', error);
            }
        });
        socket.on('call:signal:answer', (data) => {
            try {
                console.log('📞 Forwarding answer to caller:', data.callerId);
                console.log('   Call ID:', data.callId);
                this.io.to(`user:${data.callerId}`).emit('call:signal:answer', {
                    callId: data.callId,
                    answer: data.answer,
                    senderId: userId,
                });
                logger_1.default.info(`Answer forwarded for call ${data.callId} from ${userId} to ${data.callerId}`);
            }
            catch (error) {
                logger_1.default.error('Error forwarding answer:', error);
            }
        });
        socket.on('call:signal:ice', (data) => {
            try {
                console.log('📞 Forwarding ICE candidate to:', data.receiverId);
                console.log('   Call ID:', data.callId);
                this.io.to(`user:${data.receiverId}`).emit('call:signal:ice', {
                    callId: data.callId,
                    candidate: data.candidate,
                    senderId: userId,
                });
                logger_1.default.info(`ICE candidate forwarded for call ${data.callId}`);
            }
            catch (error) {
                logger_1.default.error('Error forwarding ICE candidate:', error);
            }
        });
        socket.on('call:ice-candidate', (data) => {
            try {
                this.io.to(`user:${data.targetUserId}`).emit('call:ice-candidate', {
                    callId: data.callId,
                    candidate: data.candidate,
                    fromUserId: userId,
                });
            }
            catch (error) {
                logger_1.default.error('Error forwarding ICE candidate:', error);
            }
        });
        socket.on('call:toggle-video', (data) => {
            try {
                this.io.to(`user:${data.targetUserId}`).emit('call:video-toggled', {
                    callId: data.callId,
                    videoEnabled: data.videoEnabled,
                    userId: userId,
                });
                logger_1.default.info(`User ${userId} toggled video to ${data.videoEnabled} in call ${data.callId}`);
            }
            catch (error) {
                logger_1.default.error('Error toggling video:', error);
            }
        });
        socket.on('call:toggle-audio', (data) => {
            try {
                this.io.to(`user:${data.targetUserId}`).emit('call:audio-toggled', {
                    callId: data.callId,
                    audioEnabled: data.audioEnabled,
                    userId: userId,
                });
                logger_1.default.info(`User ${userId} toggled audio to ${data.audioEnabled} in call ${data.callId}`);
            }
            catch (error) {
                logger_1.default.error('Error toggling audio:', error);
            }
        });
        socket.on('disconnect', () => {
            this.handleDisconnect(socket);
        });
        socket.onAny((eventName, ...args) => {
            console.log('📡 Socket event:', eventName, args);
        });
    }
    handleDisconnect(socket) {
        const userId = socket.userId;
        console.log('🔴 User disconnected:', userId, '(Socket:', socket.id + ')');
        logger_1.default.info(`User disconnected: ${userId} (Socket: ${socket.id})`);
        if (onlineUsers.has(userId)) {
            const sockets = onlineUsers.get(userId);
            const index = sockets.indexOf(socket.id);
            if (index > -1) {
                sockets.splice(index, 1);
            }
            if (sockets.length === 0) {
                onlineUsers.delete(userId);
                console.log('👤 User now offline:', userId);
                user_service_1.default.setUserOffline(userId).catch((err) => {
                    logger_1.default.error('Error updating offline status:', err);
                });
                this.broadcastUserStatus(userId, false);
            }
        }
        typingUsers.forEach((users, conversationId) => {
            if (users.has(userId)) {
                users.delete(userId);
                this.io.to(`conversation:${conversationId}`).emit('typing:stop', {
                    conversationId,
                    userId,
                });
            }
        });
    }
    broadcastUserStatus(userId, isOnline) {
        console.log('📤 Broadcasting user status');
        console.log('   User:', userId);
        console.log('   Status:', isOnline ? 'online' : 'offline');
        this.io.emit('user:status', {
            userId,
            isOnline,
            lastSeen: new Date(),
        });
        console.log('✅ User status broadcast complete');
    }
    getIO() {
        if (!this.io) {
            throw new Error('Socket.IO not initialized. Call initialize() first.');
        }
        return this.io;
    }
    sendToUser(userId, event, data) {
        if (this.io) {
            console.log('📤 Sending to user:', userId, 'Event:', event);
            this.io.to(`user:${userId}`).emit(event, data);
        }
    }
    sendToConversation(conversationId, event, data) {
        if (this.io) {
            console.log('📤 Sending to conversation:', conversationId, 'Event:', event);
            this.io.to(`conversation:${conversationId}`).emit(event, data);
        }
    }
    isUserOnline(userId) {
        return onlineUsers.has(userId);
    }
    getOnlineUsersCount() {
        return onlineUsers.size;
    }
}
exports.default = new SocketService();
//# sourceMappingURL=socket.service.js.map