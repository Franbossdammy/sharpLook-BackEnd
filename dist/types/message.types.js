"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageSocketEvent = void 0;
// Socket Event Types for Messages (extending your existing SocketEvent enum)
var MessageSocketEvent;
(function (MessageSocketEvent) {
    // Connection
    MessageSocketEvent["JOIN_CONVERSATION"] = "join:conversation";
    MessageSocketEvent["LEAVE_CONVERSATION"] = "leave:conversation";
    MessageSocketEvent["JOINED_CONVERSATION"] = "joined:conversation";
    // Messages
    MessageSocketEvent["MESSAGE_SEND"] = "message:send";
    MessageSocketEvent["MESSAGE_SENT"] = "message:sent";
    MessageSocketEvent["MESSAGE_NEW"] = "message:new";
    MessageSocketEvent["MESSAGE_RECEIVED"] = "message:received";
    MessageSocketEvent["MESSAGE_DELIVERED"] = "message:delivered";
    MessageSocketEvent["MESSAGE_READ"] = "message:read";
    MessageSocketEvent["MESSAGE_STATUS"] = "message:status";
    MessageSocketEvent["MESSAGE_DELETE"] = "message:delete";
    MessageSocketEvent["MESSAGE_DELETED"] = "message:deleted";
    // Reactions
    MessageSocketEvent["MESSAGE_REACT"] = "message:react";
    MessageSocketEvent["MESSAGE_REACTION"] = "message:reaction";
    // Typing
    MessageSocketEvent["TYPING_START"] = "typing:start";
    MessageSocketEvent["TYPING_STOP"] = "typing:stop";
    // User Status
    MessageSocketEvent["USER_STATUS"] = "user:status";
    MessageSocketEvent["USER_STATUS_REQUEST"] = "user:status:request";
    MessageSocketEvent["USER_STATUS_RESPONSE"] = "user:status:response";
    // Conversation
    MessageSocketEvent["CONVERSATION_READ"] = "conversation:read";
    // Error
    MessageSocketEvent["ERROR"] = "error";
})(MessageSocketEvent || (exports.MessageSocketEvent = MessageSocketEvent = {}));
//# sourceMappingURL=message.types.js.map