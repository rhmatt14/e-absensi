import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Attendance from '@/models/Attendance';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ employeeName: string }> }
) {
  try {
    await connectToDatabase();
    
    // Await params if Next.js > 15
    const resolvedParams = await params;
    const { employeeName } = resolvedParams;

    if (!employeeName) {
      return NextResponse.json({ error: 'Nama karyawan tidak valid' }, { status: 400 });
    }

    // Menghapus semua data absensi milik employeeName ini
    const result = await Attendance.deleteMany({ employeeName: decodeURIComponent(employeeName) });

    return NextResponse.json({ success: true, message: 'Riwayat absen berhasil dihapus', deletedCount: result.deletedCount }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting attendance:', error);
    return NextResponse.json({ error: 'Gagal menghapus riwayat absen' }, { status: 500 });
  }
}
