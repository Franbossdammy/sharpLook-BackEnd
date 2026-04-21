"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditMiddleware = void 0;
const auditLog_service_1 = __importDefault(require("../services/auditLog.service"));
/**
 * Middleware that logs user actions based on HTTP method and route.
 * Attach after authenticate middleware so req.user is available.
 */
const auditMiddleware = (resource) => {
    return async (req, res, next) => {
        // Skip GET requests to avoid flooding logs with view actions
        if (req.method === 'GET') {
            return next();
        }
        // Store original json method to intercept response
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            // Only log successful actions (2xx status codes)
            if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
                const action = getAction(req.method, req.path);
                const resourceId = req.params.bookingId || req.params.serviceId || req.params.orderId
                    || req.params.productId || req.params.reviewId || req.params.disputeId
                    || req.params.categoryId || req.params.withdrawalId || req.params.userId
                    || req.params.offerId || req.params.id;
                const details = buildDetails(action, resource, req);
                // Fire and forget - don't block the response
                auditLog_service_1.default.log({
                    action,
                    resource,
                    resourceId: resourceId || undefined,
                    actor: req.user.id,
                    actorEmail: req.user.email,
                    actorRole: req.user.role,
                    details,
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent'),
                }).catch(() => { }); // silently ignore logging errors
            }
            return originalJson(body);
        };
        next();
    };
};
exports.auditMiddleware = auditMiddleware;
function getAction(method, path) {
    const lowerPath = path.toLowerCase();
    // Specific action mappings based on path patterns
    if (lowerPath.includes('/approve'))
        return 'APPROVE';
    if (lowerPath.includes('/reject'))
        return 'REJECT';
    if (lowerPath.includes('/cancel'))
        return 'CANCEL';
    if (lowerPath.includes('/accept'))
        return 'ACCEPT';
    if (lowerPath.includes('/start'))
        return 'START';
    if (lowerPath.includes('/complete'))
        return 'COMPLETE';
    if (lowerPath.includes('/resolve'))
        return 'RESOLVE';
    if (lowerPath.includes('/assign'))
        return 'ASSIGN';
    if (lowerPath.includes('/escalate'))
        return 'ESCALATE';
    if (lowerPath.includes('/hide'))
        return 'HIDE';
    if (lowerPath.includes('/unhide'))
        return 'UNHIDE';
    if (lowerPath.includes('/toggle'))
        return 'TOGGLE';
    if (lowerPath.includes('/verify'))
        return 'VERIFY';
    if (lowerPath.includes('/restore'))
        return 'RESTORE';
    if (lowerPath.includes('/respond'))
        return 'RESPOND';
    if (lowerPath.includes('/counter'))
        return 'COUNTER_OFFER';
    if (lowerPath.includes('/credit'))
        return 'WALLET_CREDIT';
    if (lowerPath.includes('/debit'))
        return 'WALLET_DEBIT';
    if (lowerPath.includes('/login'))
        return 'LOGIN';
    if (lowerPath.includes('/logout'))
        return 'LOGOUT';
    if (lowerPath.includes('/register'))
        return 'REGISTER';
    // Default method-based mappings
    switch (method.toUpperCase()) {
        case 'POST': return 'CREATE';
        case 'PUT': return 'UPDATE';
        case 'PATCH': return 'UPDATE';
        case 'DELETE': return 'DELETE';
        case 'GET': return 'VIEW';
        default: return method.toUpperCase();
    }
}
function buildDetails(action, resource, req) {
    const userName = req.user?.email || 'Unknown';
    const parts = [action, resource];
    if (req.body?.reason)
        parts.push(`- Reason: ${req.body.reason}`);
    if (req.body?.notes)
        parts.push(`- Notes: ${req.body.notes}`);
    if (req.body?.description)
        parts.push(`- Description: ${req.body.description}`);
    if (req.body?.amount !== undefined)
        parts.push(`- Amount: ₦${req.body.amount}`);
    if (req.body?.userId)
        parts.push(`- Target User: ${req.body.userId}`);
    return `${userName}: ${parts.join(' ')}`;
}
//# sourceMappingURL=auditLog.js.map