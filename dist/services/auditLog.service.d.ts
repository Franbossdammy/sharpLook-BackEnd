import { IAuditLog } from '../models/AuditLog';
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
declare class AuditLogService {
    log(params: LogParams): Promise<IAuditLog | null>;
    getAll(page?: number, limit?: number, filters?: {
        action?: string;
        resource?: string;
        actor?: string;
        role?: string;
        startDate?: Date;
        endDate?: Date;
        search?: string;
    }): Promise<{
        logs: any[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    getByResource(resource: string, resourceId: string): Promise<any[]>;
}
declare const _default: AuditLogService;
export default _default;
//# sourceMappingURL=auditLog.service.d.ts.map