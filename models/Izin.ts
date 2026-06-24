import mongoose, { Schema, Document, models } from 'mongoose';

export interface IIzin extends Document {
  employeeName: string;
  jenisIzin: 'Sakit' | 'Izin' | 'Cuti';
  tanggal: Date;
  alasan: string;
  status: 'Pending' | 'Disetujui' | 'Ditolak';
  createdAt: Date;
  updatedAt: Date;
}

const IzinSchema = new Schema<IIzin>(
  {
    employeeName: { type: String, required: true },
    jenisIzin: { type: String, enum: ['Sakit', 'Izin', 'Cuti'], required: true },
    tanggal: { type: Date, required: true },
    alasan: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Disetujui', 'Ditolak'], default: 'Pending' },
  },
  {
    timestamps: true,
  }
);

if (models.Izin) {
  delete models.Izin;
}

export default mongoose.model<IIzin>('Izin', IzinSchema);
