import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

// Helper function untuk menghitung jarak euclidean antara dua descriptor
function euclideanDistance(desc1: number[], desc2: number[]) {
  if (!desc1 || !desc2 || desc1.length !== desc2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    sum += Math.pow(desc1[i] - desc2[i], 2);
  }
  return Math.sqrt(sum);
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { faceDescriptor } = await req.json();

    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return NextResponse.json({ success: false, error: 'Invalid face descriptor' }, { status: 400 });
    }

    await dbConnect();

    // Ambil semua user lain yang sudah mendaftarkan wajahnya
    // Menggunakan $exists pada index 0 untuk memastikan array tidak kosong
    const otherUsers = await User.find({
      _id: { $ne: payload.userId },
      'faceDescriptor.0': { $exists: true }
    }).lean();

    console.log(`Pengecekan duplikat wajah. Ditemukan ${otherUsers.length} user lain dengan wajah terdaftar.`);

    // Cek apakah wajah ini sudah dipakai oleh akun lain
    for (const otherUser of otherUsers) {
      const distance = euclideanDistance(faceDescriptor, otherUser.faceDescriptor as number[]);
      console.log(`Membandingkan dengan user ${otherUser.username}, jarak: ${distance}`);
      
      // Threshold 0.55 sama seperti di frontend
      if (distance < 0.55) {
        return NextResponse.json({ 
          success: false, 
          error: `Wajah ini terdeteksi mirip dengan akun lain. jangan gunakan wajah orang lain gunakanlah wajah anda sendiri!!!` 
        }, { status: 400 });
      }
    }

    await User.findByIdAndUpdate(payload.userId, { faceDescriptor });

    return NextResponse.json({ success: true, message: 'Wajah berhasil didaftarkan' });
  } catch (error) {
    console.error('Error registering face:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
