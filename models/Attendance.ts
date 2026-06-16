import mongoose, { Schema, Document, models } from 'mongoose';

export interface IAttendance extends Document {
  employeeName: string;
  photo: string; // URL string from Cloudinary
  location: {
    latitude: number;
    longitude: number;
  };
  type: string; // 'masuk' atau 'keluar'
  timestamp: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    employeeName: { type: String, required: true },
    photo: { type: String, required: true },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    type: { type: String, enum: ['masuk', 'keluar'], default: 'masuk' },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Prevent re-compilation of model
export default models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema);
