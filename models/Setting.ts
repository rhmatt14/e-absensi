import mongoose, { Schema, Document } from 'mongoose';

export interface ISetting extends Document {
  key: string;
  value?: any;
  jamMasuk?: string;
  jamPulang?: string;
  toleransiKeterlambatan?: number;
}

const SettingSchema: Schema = new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: Schema.Types.Mixed },
  jamMasuk: { type: String, default: '08:00' },
  jamPulang: { type: String, default: '17:00' },
  toleransiKeterlambatan: { type: Number, default: 15 },
});

export default mongoose.models.Setting || mongoose.model<ISetting>('Setting', SettingSchema);
