import mongoose, { Document } from 'mongoose';
export interface IAppConfig extends Document {
    minimumVersion: string;
    latestVersion: string;
    forceUpdate: boolean;
    updateMessage: string;
}
declare const _default: mongoose.Model<IAppConfig, {}, {}, {}, mongoose.Document<unknown, {}, IAppConfig, {}, {}> & IAppConfig & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=AppConfig.d.ts.map