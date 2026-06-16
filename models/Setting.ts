import mongoose, { Schema, Document } from 'mongoose';

export interface ISetting extends Document {
  key: string;
  value: boolean;
}

const SettingSchema: Schema = new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: Boolean, required: true },
});

export default mongoose.models.Setting || mongoose.model<ISetting>('Setting', SettingSchema);
