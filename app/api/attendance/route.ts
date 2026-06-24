import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
import Setting from '@/models/Setting';
import { v2 as cloudinary } from 'cloudinary';

export const dynamic = 'force-dynamic';

// Konfigurasi Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { photo, latitude, longitude, type } = body;
    const employeeName = req.headers.get('x-user-name');

    if (!employeeName || !photo || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'Data tidak lengkap. Pastikan nama, foto, dan lokasi telah diisi.' }, { status: 400 });
    }

    // Get current date in Asia/Jakarta timezone
    const nowStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
    const nowJakarta = new Date(nowStr);
    
    // Start and End of today in Jakarta time
    const startOfDay = new Date(nowJakarta);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(nowJakarta);
    endOfDay.setHours(23, 59, 59, 999);

    // Cari record untuk hari ini menggunakan rentang waktu
    let todayRecord = await Attendance.findOne({
      employeeName,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    // Normalisasi type (pulang dan keluar dianggap sama)
    const normalizedType = type === 'pulang' ? 'keluar' : type;

    // Strict Duplicate Check
    if (normalizedType === 'masuk') {
      if (todayRecord) {
        return NextResponse.json(
          { error: 'Anda sudah melakukan absen masuk hari ini!' },
          { status: 400 }
        );
      }
    } else if (normalizedType === 'keluar') {
      if (!todayRecord) {
        return NextResponse.json(
          { error: 'Anda belum Absen Masuk hari ini.' },
          { status: 400 }
        );
      }
      if (todayRecord.waktuKeluar) {
        return NextResponse.json(
          { error: 'Anda sudah Absen Pulang hari ini.' },
          { status: 400 }
        );
      }
    }

    // Upload base64 image to Cloudinary
    let photoUrl = '';
    try {
      const uploadResponse = await cloudinary.uploader.upload(photo, {
        folder: 'absensi_app',
      });
      photoUrl = uploadResponse.secure_url;
    } catch (uploadError: any) {
      return NextResponse.json({ error: 'Gagal mengupload foto', details: uploadError?.message }, { status: 500 });
    }

    // Simpan ke MongoDB berdasarkan type
    if (normalizedType === 'masuk') {
      if (!todayRecord) {
        // Buat record baru untuk hari ini
        todayRecord = await Attendance.create({
          employeeName,
          date: startOfDay,
          waktuMasuk: new Date(),
          fotoMasuk: photoUrl,
          lokasiMasuk: { latitude, longitude }
        });
      } else {
        // Jika karena alasan tertentu record sudah ada tapi waktuMasuk kosong
        todayRecord.waktuMasuk = new Date();
        todayRecord.fotoMasuk = photoUrl;
        todayRecord.lokasiMasuk = { latitude, longitude };
        await todayRecord.save();
      }
    } else if (normalizedType === 'keluar') {
      // 1. Pasang satpam di sini! Kalau belum absen masuk, tolak.
      if (!todayRecord) {
        return NextResponse.json(
          { success: false, error: 'Anda belum absen masuk hari ini!' },
          { status: 400 }
        );
      }

      // 2. Kalau aman (todayRecord ada), baru update datanya
      todayRecord.waktuKeluar = new Date();
      todayRecord.fotoKeluar = photoUrl; // Pastikan nama variabel ini sesuai (photo atau photoUrl)
      todayRecord.lokasiKeluar = { latitude, longitude };
      await todayRecord.save();
    }

    return NextResponse.json({ success: true, data: todayRecord }, { status: 201 });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan data absensi', details: error?.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const employeeName = req.headers.get('x-user-name');
    const role = req.headers.get('x-user-role');

    // Jika bukan admin, filter hanya absensinya sendiri
    let query = {};
    if (role !== 'admin') {
      if (!employeeName) {
        return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 401 });
      }
      query = { employeeName };
    }

    // Sort berdasarkan date descending (terbaru di atas)
    const records = await Attendance.find(query).sort({ date: -1 });
    return NextResponse.json({ success: true, data: records }, { status: 200 });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}
