import mongoose, { Document, Schema } from 'mongoose';

export interface IAppConfig extends Document {
  minimumVersion: string;
  latestVersion: string;
  forceUpdate: boolean;
  updateMessage: string;
}

const AppConfigSchema = new Schema<IAppConfig>(
  {
    minimumVersion: { type: String, required: true, default: '2.2' },
    latestVersion:  { type: String, required: true, default: '2.2' },
    forceUpdate:    { type: Boolean, default: false },
    updateMessage:  { type: String, default: "A new version of LookReal is available with improvements and bug fixes." },
  },
  { timestamps: true }
);

export default mongoose.model<IAppConfig>('AppConfig', AppConfigSchema);
