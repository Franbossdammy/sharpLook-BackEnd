"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const helpers_1 = require("../utils/helpers");
const logger_1 = __importDefault(require("../utils/logger"));
class AuditLogService {
    async log(params) {
        try {
            const auditLog = await AuditLog_1.default.create({
                action: params.action,
                resource: params.resource,
                resourceId: params.resourceId,
                actor: params.actor,
                actorEmail: params.actorEmail,
                actorRole: params.actorRole,
                details: params.details,
                changes: params.changes,
                ipAddress: params.ipAddress,
                userAgent: params.userAgent,
            });
            return auditLog;
        }
        catch (error) {
            logger_1.default.error('Failed to create audit log:', error);
            return null;
        }
    }
    async getAll(page = 1, limit = 20, filters) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const query = {};
        if (filters?.action) {
            query.action = filters.action;
        }
        if (filters?.resource) {
            query.resource = filters.resource;
        }
        if (filters?.actor) {
            query.actor = filters.actor;
        }
        if (filters?.role) {
            query.actorRole = filters.role;
        }
        if (filters?.startDate || filters?.endDate) {
            query.createdAt = {};
            if (filters.startDate)
                query.createdAt.$gte = filters.startDate;
            if (filters.endDate)
                query.createdAt.$lte = filters.endDate;
        }
        if (filters?.search) {
            query.$or = [
                { action: { $regex: filters.search, $options: 'i' } },
                { resource: { $regex: filters.search, $options: 'i' } },
                { details: { $regex: filters.search, $options: 'i' } },
                { actorEmail: { $regex: filters.search, $options: 'i' } },
            ];
        }
        const [logs, total] = await Promise.all([
            AuditLog_1.default.find(query)
                .populate('actor', 'firstName lastName email role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            AuditLog_1.default.countDocuments(query),
        ]);
        return {
            logs,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getByResource(resource, resourceId) {
        return AuditLog_1.default.find({ resource, resourceId })
            .populate('actor', 'firstName lastName email role')
            .sort({ createdAt: -1 })
            .lean();
    }
}
exports.default = new AuditLogService();
//# sourceMappingURL=auditLog.service.js.map