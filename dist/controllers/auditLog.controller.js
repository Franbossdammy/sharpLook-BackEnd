"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auditLog_service_1 = __importDefault(require("../services/auditLog.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
class AuditLogController {
    constructor() {
        /**
         * Get all audit logs (Admin)
         * GET /api/v1/audit-logs
         */
        this.getAll = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = {
                action: req.query.action,
                resource: req.query.resource,
                actor: req.query.actor,
                role: req.query.role,
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
                search: req.query.search,
            };
            const result = await auditLog_service_1.default.getAll(page, limit, filters);
            return response_1.default.paginated(res, 'Audit logs retrieved successfully', result.logs, page, limit, result.total);
        });
        /**
         * Get audit logs for a specific resource
         * GET /api/v1/audit-logs/:resource/:resourceId
         */
        this.getByResource = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { resource, resourceId } = req.params;
            const logs = await auditLog_service_1.default.getByResource(resource, resourceId);
            return response_1.default.success(res, 'Audit logs retrieved successfully', { logs });
        });
    }
}
exports.default = new AuditLogController();
//# sourceMappingURL=auditLog.controller.js.map