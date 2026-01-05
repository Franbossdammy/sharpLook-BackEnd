import { Server as HTTPServer } from 'http';
import { Server } from 'socket.io';
declare class SocketService {
    private io;
    initialize(httpServer: HTTPServer): Server;
    /**
     * Emit wallet funded event to user
     */
    emitWalletFunded(userId: string, data: {
        reference: string;
        amount: number;
        newBalance: number;
    }): void;
    /**
     * Emit wallet funding failed event to user
     */
    emitWalletFundingFailed(userId: string, data: {
        reference: string;
        reason?: string;
    }): void;
    /**
     * Emit withdrawal success event to user
     */
    emitWithdrawalSuccess(userId: string, data: {
        reference: string;
        amount: number;
        newBalance: number;
    }): void;
    /**
     * Emit withdrawal failed event to user
     */
    emitWithdrawalFailed(userId: string, data: {
        reference: string;
        reason?: string;
    }): void;
    /**
     * Emit generic payment event to user
     */
    emitPaymentEvent(userId: string, event: string, data: any): void;
    private handleConnection;
    private handleDisconnect;
    private broadcastUserStatus;
    getIO(): Server;
    sendToUser(userId: string, event: string, data: any): void;
    sendToConversation(conversationId: string, event: string, data: any): void;
    isUserOnline(userId: string): boolean;
    getOnlineUsersCount(): number;
}
declare const _default: SocketService;
export default _default;
//# sourceMappingURL=socket.service.d.ts.map