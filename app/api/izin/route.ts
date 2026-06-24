import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Izin from '@/models/Izin';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    
    // Extracted directly from the session token to bypass middleware dependency issues
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Sesi tidak valid' }, { status: 401 });
    }

    // Allow request if user is authenticated
    const employeeName = payload.name;

    const body = await req.json();
    const { jenisIzin, tanggal, alasan } = body;

    if (!jenisIzin || !tanggal || !alasan) {
      return NextResponse.json({ error: 'Data tidak lengkap. Pastikan semua field telah diisi.' }, { status: 400 });
    }

    const newIzin = await Izin.create({
      employeeName: String(employeeName),
      jenisIzin: String(jenisIzin) as 'Sakit' | 'Izin' | 'Cuti',
      tanggal: new Date(String(tanggal)),
      alasan: String(alasan),
    });

    return NextResponse.json({ success: true, data: newIzin }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating leave request:', error);
    return NextResponse.json({ error: 'Gagal membuat pengajuan izin', details: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Sesi tidak valid' }, { status: 401 });
    }

    const employeeName = payload.name;
    const role = payload.role;

    let query = {};
    // If not admin, restrict to only their own requests. Both Admin and Karyawan are allowed.
    if (role !== 'admin') {
      query = { employeeName };
    }

    // Sort by most recent first
    const records = await Izin.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: records }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching leave requests:', error);
    return NextResponse.json({ error: 'Gagal mengambil data', details: error.message }, { status: 500 });
  }
}
