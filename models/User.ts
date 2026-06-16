import mongoose, { Schema, Document, models } from 'mongoose';

export interface IUser extends Document {
  username: string;
  passwordHash: string;
  name: string;
  role: 'admin' | 'employee';
  faceDescriptor: number[];
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'employee'], default: 'employee' },
  faceDescriptor: { type: [Number], default: [] },
}, { timestamps: true });

export default models.User || mongoose.model<IUser>('User', UserSchema);
