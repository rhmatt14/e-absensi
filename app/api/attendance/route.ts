import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
import Setting from '@/models/Setting';
import { v2 as cloudinary } from 'cloudinary';

// Konfigurasi Cloudinary
console.log('[API INIT] Membaca konfigurasi Cloudinary...');
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
console.log('[API INIT] Cloud Name yang terbaca:', process.env.CLOUDINARY_CLOUD_NAME);

export async function POST(req: Request) {
  console.log('\n=============================================');
  console.log('[API POST] Memulai request POST /api/attendance');
  
  try {
    console.log('[API POST] [1/5] Mencoba koneksi ke database MongoDB...');
    await connectToDatabase();
    console.log('[API POST] [1/5] Berhasil terhubung ke MongoDB!');
    
    console.log('[API POST] [2/5] Membaca request body...');
    const body = await req.json();
    const { photo, location, type = 'masuk' } = body;
    const employeeName = req.headers.get('x-user-name');
    console.log(`[API POST] [2/5] Body terbaca -> Nama (dari token): ${employeeName}, Lokasi: ${JSON.stringify(location)}, Ukuran Foto: ${photo ? photo.length : 0} karakter, Tipe: ${type}`);

    if (!employeeName || !photo || !location || !location.latitude || !location.longitude) {
      console.error('[API POST] [ERROR] Data tidak lengkap!');
      return NextResponse.json({ error: 'Data tidak lengkap. Pastikan nama, foto, dan lokasi telah diisi.' }, { status: 400 });
    }

    // Ambil setting enableDailyLimit
    let setting = await Setting.findOne({ key: 'enableDailyLimit' });
    const enableDailyLimit = setting ? setting.value : true;

    if (enableDailyLimit) {
      // Validasi urutan absen (Masuk lalu Keluar) untuk hari ini
      console.log('[API POST] [2.5/5] Melakukan validasi urutan absensi...');
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const lastRecord = await Attendance.findOne({
        employeeName,
        timestamp: { $gte: startOfDay }
      }).sort({ timestamp: -1 });

      if (type === 'masuk') {
        if (lastRecord && lastRecord.type === 'masuk') {
          return NextResponse.json({ error: 'Anda sudah melakukan Absen Masuk hari ini. Silakan Absen Keluar terlebih dahulu.' }, { status: 400 });
        }
      } else if (type === 'keluar') {
        if (!lastRecord || lastRecord.type === 'keluar') {
          return NextResponse.json({ error: 'Anda belum Absen Masuk atau sudah Absen Keluar hari ini.' }, { status: 400 });
        }
      }
    }

    // Upload base64 image to Cloudinary
    let photoUrl = '';
    try {
      console.log('[API POST] [3/5] Memulai upload gambar ke Cloudinary...');
      const uploadResponse = await cloudinary.uploader.upload(photo, {
        folder: 'absensi_app',
      });
      photoUrl = uploadResponse.secure_url;
      console.log('[API POST] [3/5] Upload Cloudinary berhasil! URL:', photoUrl);
    } catch (uploadError: any) {
      console.error('[API POST] [ERROR 3/5] Gagal upload ke Cloudinary. Detail Error:', uploadError);
      return NextResponse.json({ error: 'Gagal mengupload foto ke server penyedia gambar', details: uploadError?.message || String(uploadError) }, { status: 500 });
    }

    // Simpan ke MongoDB dengan URL dari Cloudinary
    console.log('[API POST] [4/5] Menyimpan data ke MongoDB...');
    const newAttendance = await Attendance.create({
      employeeName,
      photo: photoUrl, // Menyimpan URL, bukan Base64
      location,
      type
    });
    console.log('[API POST] [4/5] Berhasil menyimpan ke MongoDB! ID:', newAttendance._id);

    console.log('[API POST] [5/5] Selesai. Mengirim response sukses.');
    console.log('=============================================\n');
    return NextResponse.json({ success: true, data: newAttendance }, { status: 201 });
  } catch (error: any) {
    console.error('[API POST] [FATAL ERROR] Terjadi kesalahan utama:', error);
    console.log('=============================================\n');
    return NextResponse.json({ error: 'Gagal menyimpan data absensi', details: error?.message || String(error) }, { status: 500 });
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

    const records = await Attendance.find(query).sort({ timestamp: -1 });
    return NextResponse.json({ success: true, data: records }, { status: 200 });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}
