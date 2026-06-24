import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rute yang butuh autentikasi
  const isProtectedPath =
    pathname === '/' ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/karyawan') ||
    pathname.startsWith('/api/attendance') ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/settings') ||
    pathname.startsWith('/api/izin');

  // Jika tidak protected, biarkan lewat
  if (!isProtectedPath) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;

  // Jika tidak ada token, arahkan ke halaman login (untuk halaman web) atau beri 401 (untuk API)
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verifikasi token
  const payload = await verifyToken(token);
  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth_token');
    return response;
  }

  // ---- Role-based routing untuk halaman root ("/") ----
  if (pathname === '/') {
    if (payload.role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.redirect(new URL('/karyawan', request.url));
  }

  // ---- Proteksi halaman admin: hanya role admin ----
  if (pathname.startsWith('/admin') && payload.role !== 'admin') {
    return NextResponse.redirect(new URL('/karyawan', request.url));
  }

  // ---- Proteksi halaman karyawan: hanya role employee ----
  if (pathname.startsWith('/karyawan') && payload.role !== 'employee') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // Lanjutkan request, dan kita bisa sematkan informasi user di Header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', String(payload.userId));
  requestHeaders.set('x-user-name', String(payload.name));
  requestHeaders.set('x-user-role', String(payload.role));

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Konfigurasi path mana saja yang akan dicegat oleh middleware
export const config = {
  matcher: ['/', '/admin/:path*', '/karyawan/:path*', '/api/attendance', '/api/izin', '/api/admin/:path*', '/api/settings'],
};
