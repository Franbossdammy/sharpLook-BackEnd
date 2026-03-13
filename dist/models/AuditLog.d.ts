import mongoose, { Document, Model } from 'mongoose';
export interface IAuditLog extends Document {
    _id: mongoose.Types.ObjectId;
    action: string;
    resource: string;
    resourceId?: string;
    actor: mongoose.Types.ObjectId;
    actorEmail?: string;
    actorRole?: string;
    details?: string;
    changes?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
}
declare const AuditLog: Model<IAuditLog>;
export default AuditLog;
//# sourceMappingURL=AuditLog.d.ts.map