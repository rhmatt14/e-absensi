import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    // Middleware sudah memvalidasi bahwa hanya admin yang bisa mengakses endpoint ini.
    await connectToDatabase();
    
    const body = await req.json();
    const { username, password, name, role } = body;

    if (!username || !password || !name) {
      return NextResponse.json({ error: 'Username, password, dan nama harus diisi' }, { status: 400 });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 400 });
    }

    // Hash password sebelum disimpan
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      username,
      passwordHash,
      name,
      role: role === 'admin' ? 'admin' : 'employee'
    });

    return NextResponse.json({ success: true, message: 'Akun berhasil dibuat', user: { username: newUser.username, name: newUser.name, role: newUser.role } }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Gagal membuat akun' }, { status: 500 });
  }
}

export async function GET() {
  try {
    await connectToDatabase();
    // Hanya mengembalikan username, name, role (tanpa password)
    const users = await User.find({}, 'username name role createdAt').sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: users }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal mengambil daftar pengguna' }, { status: 500 });
  }
}
