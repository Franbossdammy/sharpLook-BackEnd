import AuditLog, { IAuditLog } from '../models/AuditLog';
import { parsePaginationParams } from '../utils/helpers';
import logger from '../utils/logger';

interface LogParams {
  action: string;
  resource: string;
  resourceId?: string;
  actor: string;
  actorEmail?: string;
  actorRole?: string;
  details?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

class AuditLogService {
  public async log(params: LogParams): Promise<IAuditLog | null> {
    try {
      const auditLog = await AuditLog.create({
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
    } catch (error) {
      logger.error('Failed to create audit log:', error);
      return null;
    }
  }

  public async getAll(
    page: number = 1,
    limit: number = 20,
    filters?: {
      action?: string;
      resource?: string;
      actor?: string;
      role?: string;
      startDate?: Date;
      endDate?: Date;
      search?: string;
    }
  ): Promise<{ logs: any[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    const query: any = {};

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
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
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
      AuditLog.find(query)
        .populate('actor', 'firstName lastName email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getByResource(resource: string, resourceId: string): Promise<any[]> {
    return AuditLog.find({ resource, resourceId })
      .populate('actor', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .lean();
  }
}

export default new AuditLogService();
