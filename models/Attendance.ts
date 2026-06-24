import mongoose, { Schema, Document, models } from 'mongoose';

export interface IAttendance extends Document {
  employeeName: string;
  date: Date; // Digunakan untuk mencari record berdasarkan hari (Start of day)
  waktuMasuk?: Date;
  fotoMasuk?: string;
  lokasiMasuk?: {
    latitude: number;
    longitude: number;
  };
  waktuKeluar?: Date;
  fotoKeluar?: string;
  lokasiKeluar?: {
    latitude: number;
    longitude: number;
  };
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    employeeName: { type: String, required: true },
    date: { type: Date, required: true },
    waktuMasuk: { type: Date, required: true },
    fotoMasuk: { type: String, required: true },
    lokasiMasuk: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    waktuKeluar: { type: Date },
    fotoKeluar: { type: String },
    lokasiKeluar: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
  },
  {
    timestamps: true,
  }
);

// Prevent re-compilation of model caching old schema in Next.js HMR
if (models.Attendance) {
  delete models.Attendance;
}

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema);
