import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Setting from '@/models/Setting';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    let setting = await Setting.findOne({ key: 'global_settings' });
    
    if (!setting) {
      // Create with a dummy boolean 'value' to prevent crashes with cached old mongoose schemas that required a boolean value
      setting = await Setting.create({ 
        key: 'global_settings',
        value: true,
        jamMasuk: '08:00',
        jamPulang: '17:00',
        toleransiKeterlambatan: 15
      });
    }

    // Also try to fetch enableDailyLimit just in case it exists
    let oldSetting = await Setting.findOne({ key: 'enableDailyLimit' });

    return NextResponse.json({ 
      success: true, 
      data: { 
        enableDailyLimit: oldSetting ? oldSetting.value : true,
        jamMasuk: setting.jamMasuk || '08:00',
        jamPulang: setting.jamPulang || '17:00',
        toleransiKeterlambatan: setting.toleransiKeterlambatan || 15
      } 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Gagal mengambil pengaturan', details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Note: If x-user-role is not present in client fetches, we might bypass this check or ensure middleware provides it.
    // The user's prompt did not ask to change the role check, so we keep it.
    const role = req.headers.get('x-user-role');
    if (role && role !== 'admin') {
      return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 });
    }

    await connectToDatabase();
    const body = await req.json();
    
    let setting = await Setting.findOne({ key: 'global_settings' });
    if (!setting) {
      setting = new Setting({ key: 'global_settings', value: true });
    }

    if (body.jamMasuk !== undefined) setting.jamMasuk = body.jamMasuk;
    if (body.jamPulang !== undefined) setting.jamPulang = body.jamPulang;
    if (body.toleransiKeterlambatan !== undefined) setting.toleransiKeterlambatan = body.toleransiKeterlambatan;
    
    await setting.save();

    let enableDailyLimitVal = true;
    if (body.enableDailyLimit !== undefined) {
      if (typeof body.enableDailyLimit !== 'boolean') {
        return NextResponse.json({ error: 'Nilai enableDailyLimit tidak valid' }, { status: 400 });
      }
      
      // Update the legacy doc
      const updatedOld = await Setting.findOneAndUpdate(
        { key: 'enableDailyLimit' },
        { value: body.enableDailyLimit },
        { upsert: true, new: true }
      );
      enableDailyLimitVal = updatedOld.value;
    } else {
      let oldSetting = await Setting.findOne({ key: 'enableDailyLimit' });
      if (oldSetting) enableDailyLimitVal = oldSetting.value;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Pengaturan berhasil disimpan',
      data: { 
        enableDailyLimit: enableDailyLimitVal,
        jamMasuk: setting.jamMasuk,
        jamPulang: setting.jamPulang,
        toleransiKeterlambatan: setting.toleransiKeterlambatan
      } 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Gagal menyimpan pengaturan', details: error.message }, { status: 500 });
  }
}
