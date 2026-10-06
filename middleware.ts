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

  // Helper: get home route for a role
  const getRoleHome = (role: string): string => {
    if (role === 'collecting_officer') return '/collecting-officer';
    if (role === 'disbursing_officer') return '/disbursing-officer';
    if (role === 'auditor') return '/auditor';
    if (role === 'admin') return '/admin';
    return '/collecting-officer';
  };

  // Legacy /treasurer/* or deprecated /member/* → redirect to /collecting-officer/collections
  if (pathname.startsWith('/treasurer') || pathname.startsWith('/member')) {
    return NextResponse.redirect(new URL('/collecting-officer/collections', req.url));
  }

  // Role Guard: /collecting-officer routes
  if (pathname.startsWith('/collecting-officer')) {
    if (rawRole !== 'collecting_officer' && rawRole !== 'admin') {
      return NextResponse.redirect(new URL(getRoleHome(rawRole), req.url));
    }
  }

  // Role Guard: /disbursing-officer routes
  if (pathname.startsWith('/disbursing-officer')) {
    if (rawRole !== 'disbursing_officer' && rawRole !== 'admin') {
      return NextResponse.redirect(new URL(getRoleHome(rawRole), req.url));
    }
  }

  // Role Guard: /auditor routes
  if (pathname.startsWith('/auditor')) {
    if (rawRole !== 'auditor' && rawRole !== 'admin') {
      return NextResponse.redirect(new URL(getRoleHome(rawRole), req.url));
    }
  }

  // Role Guard: /admin routes
  if (pathname.startsWith('/admin')) {
    if (rawRole !== 'admin') {
      return NextResponse.redirect(new URL(getRoleHome(rawRole), req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/member/:path*',
    '/treasurer/:path*',
    '/collecting-officer/:path*',
    '/disbursing-officer/:path*',
    '/auditor/:path*',
    '/admin/:path*',
  ],
};
