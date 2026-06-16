import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  await dbConnect();
  const dbUser = await User.findById(payload.userId).lean();

  return NextResponse.json({
    authenticated: true,
    user: {
      id: payload.userId,
      username: payload.username,
      name: payload.name,
      role: payload.role,
      hasFaceRegistered: dbUser && dbUser.faceDescriptor && dbUser.faceDescriptor.length > 0,
      faceDescriptor: dbUser?.faceDescriptor || []
    }
  }, { status: 200 });
}
