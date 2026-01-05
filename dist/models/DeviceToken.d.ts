import mongoose, { Document, Model } from 'mongoose';
export interface IDeviceToken extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    token: string;
    deviceType: 'ios' | 'android' | 'web';
    deviceName?: string;
    isActive: boolean;
    lastUsedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const DeviceToken: Model<IDeviceToken>;
export default DeviceToken;
//# sourceMappingURL=DeviceToken.d.ts.map