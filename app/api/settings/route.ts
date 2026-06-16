import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Setting from '@/models/Setting';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    let setting = await Setting.findOne({ key: 'enableDailyLimit' });
    if (!setting) {
      setting = await Setting.create({ key: 'enableDailyLimit', value: true });
    }
    return NextResponse.json({ success: true, data: { enableDailyLimit: setting.value } }, { status: 200 });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Gagal mengambil pengaturan' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 });
    }

    await connectToDatabase();
    const { enableDailyLimit } = await req.json();

    if (typeof enableDailyLimit !== 'boolean') {
      return NextResponse.json({ error: 'Nilai enableDailyLimit tidak valid' }, { status: 400 });
    }

    const setting = await Setting.findOneAndUpdate(
      { key: 'enableDailyLimit' },
      { value: enableDailyLimit },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, data: { enableDailyLimit: setting.value } }, { status: 200 });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Gagal menyimpan pengaturan' }, { status: 500 });
  }
}
