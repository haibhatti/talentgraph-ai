import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const role = (request.cookies.get('user_role')?.value || '').toLowerCase()

  // /profile is explicitly whitelisted for both HR and Candidate — no redirect loop
  if (pathname === '/profile' || pathname.startsWith('/profile/')) {
    return NextResponse.next()
  }

  // No role cookie yet: do not guess, or we bounce against Supabase metadata
  if (!role) {
    return NextResponse.next()
  }

  const isHrDashboard = pathname === '/dashboard' || pathname.startsWith('/dashboard/')
  const isHrWorkspace =
    isHrDashboard ||
    pathname.startsWith('/requisitions') ||
    pathname.startsWith('/evaluate')
  const isCandidateDashboard =
    pathname === '/candidate/dashboard' || pathname.startsWith('/candidate/dashboard/')

  // HR-only surfaces: send Candidates to /candidate/dashboard
  if (isHrWorkspace && role !== 'hr') {
    return NextResponse.redirect(new URL('/candidate/dashboard', request.url))
  }

  // Candidate-only surface: send HR to /dashboard
  if (isCandidateDashboard && role === 'hr') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/requisitions/:path*',
    '/evaluate/:path*',
    '/candidate/:path*',
    '/profile',
    '/profile/:path*',
  ],
}
