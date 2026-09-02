import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets, api routes, and login
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/bdoea-logo') ||
    pathname === '/login' ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET || 'change_this_to_a_long_random_secret' });

  // If unauthenticated, redirect to login
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const rawRole = ((token.role as string) || '').toLowerCase();

  // Role Guard: /member routes
  if (pathname.startsWith('/member')) {
    if (rawRole !== 'member' && rawRole !== 'admin' && rawRole !== 'user') {
      // Redirect to role home
      if (rawRole === 'treasurer') return NextResponse.redirect(new URL('/treasurer/dashboard', req.url));
      if (rawRole === 'auditor') return NextResponse.redirect(new URL('/auditor/collections', req.url));
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  // Role Guard: /treasurer routes
  if (pathname.startsWith('/treasurer')) {
    if (rawRole !== 'treasurer' && rawRole !== 'admin') {
      if (rawRole === 'member' || rawRole === 'user') return NextResponse.redirect(new URL('/member/dashboard', req.url));
      if (rawRole === 'auditor') return NextResponse.redirect(new URL('/auditor/collections', req.url));
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  // Role Guard: /auditor routes
  if (pathname.startsWith('/auditor')) {
    if (rawRole !== 'auditor' && rawRole !== 'admin') {
      if (rawRole === 'member' || rawRole === 'user') return NextResponse.redirect(new URL('/member/dashboard', req.url));
      if (rawRole === 'treasurer') return NextResponse.redirect(new URL('/treasurer/dashboard', req.url));
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/member/:path*',
    '/treasurer/:path*',
    '/auditor/:path*',
    '/admin/:path*',
  ],
};
