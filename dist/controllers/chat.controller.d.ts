import { Response, NextFunction } from 'express';
declare class ChatController {
    createOrGetConversation: (req: import("express").Request, res: Response, next: NextFunction) => void;
    sendMessage: (req: import("express").Request, res: Response, next: NextFunction) => void;
    markAsRead: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getUserConversations: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getConversationMessages: (req: import("express").Request, res: Response, next: NextFunction) => void;
    deleteMessage: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getUnreadCount: (req: import("express").Request, res: Response, next: NextFunction) => void;
    searchMessages: (req: import("express").Request, res: Response, next: NextFunction) => void;
    archiveConversation: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: ChatController;
export default _default;
//# sourceMappingURL=chat.controller.d.ts.map