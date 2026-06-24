import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
import Izin from '@/models/Izin';

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Tidak memiliki akses (Unauthenticated)' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Tidak memiliki akses (Unauthorized)' }, { status: 403 });
    }

    await dbConnect();
    
    // Clear all records
    await Attendance.deleteMany({});
    await Izin.deleteMany({});

    return NextResponse.json({ success: true, message: 'Semua data absensi dan izin berhasil dihapus.' }, { status: 200 });
  } catch (error: any) {
    console.error('Error resetting attendance data:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat menghapus data', details: error?.message }, { status: 500 });
  }
}
