import mongoose, { Document } from 'mongoose';
export interface ICall extends Document {
    caller: mongoose.Types.ObjectId;
    receiver: mongoose.Types.ObjectId;
    type: 'voice' | 'video';
    status: 'initiated' | 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended' | 'busy' | 'cancelled';
    startedAt?: Date;
    endedAt?: Date;
    duration?: number;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ICall, {}, {}, {}, mongoose.Document<unknown, {}, ICall, {}, {}> & ICall & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Call.d.ts.map