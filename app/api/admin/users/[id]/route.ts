import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import Attendance from '@/models/Attendance';
import Izin from '@/models/Izin';
import bcrypt from 'bcryptjs';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
    }

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Akun berhasil dihapus' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Gagal menghapus akun' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
    }

    const body = await req.json();
    const { name, username, role, password } = body;

    if (!name || !username || !role) {
      return NextResponse.json({ error: 'Nama, username, dan role harus diisi.' }, { status: 400 });
    }

    // Fetch the current user to capture oldName before any changes
    const currentUser = await User.findById(id);
    if (!currentUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    // Check if username is taken by a DIFFERENT user
    const takenByOther = await User.findOne({ username, _id: { $ne: id } });
    if (takenByOther) {
      return NextResponse.json({ error: 'Username sudah digunakan oleh pengguna lain.' }, { status: 400 });
    }

    // Cascade update: if the name changed, propagate to Attendance and Izin records
    const oldName = String(currentUser.name);
    const newName = String(name);
    if (oldName !== newName) {
      await Attendance.updateMany({ employeeName: oldName }, { $set: { employeeName: newName } });
      await Izin.updateMany({ employeeName: oldName }, { $set: { employeeName: newName } });
    }

    const updateData: Record<string, any> = {
      name: newName,
      username: String(username),
      role: String(role) === 'admin' ? 'admin' : 'employee',
    };

    // Only update password if a new one is provided
    if (password && String(password).trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(String(password), salt);
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, select: 'username name role createdAt' }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Akun berhasil diperbarui.', data: updatedUser }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Gagal memperbarui akun.' }, { status: 500 });
  }
}
