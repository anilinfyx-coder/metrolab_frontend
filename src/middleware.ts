import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || request.nextUrl.hostname;
  
  // Whitelabel detection logic
  // We consider a domain to be whitelabel if it is not localhost, not 127.0.0.1, 
  // and not the main lab.metrolab.biz domain.
  // Note: Vercel edge domains (.vercel.app) might need to be excluded if used for main app.
  let isWhitelabel = 
    !hostname.includes('localhost') && 
    !hostname.includes('127.0.0.1') && 
    !hostname.includes('lab.metrolab.biz') &&
    !hostname.includes('vercel.app'); // Add standard dev exclusions

  if (!isWhitelabel && (hostname.includes('localhost') || hostname.includes('127.0.0.1'))) {
    const testDomainCookie = request.cookies.get('test_domain')?.value;
    const testDomainQuery = request.nextUrl.searchParams.get('test_domain');
    if (testDomainCookie || testDomainQuery) {
      isWhitelabel = true;
    }
  }

  const pathname = request.nextUrl.pathname;

  if (isWhitelabel) {
    // If accessing /dashboard or /dashboard/something on a whitelabel domain, 
    // rewrite internally to /b2b/dashboard...
    if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
      const newPathname = `/b2b${pathname}`;
      const url = request.nextUrl.clone();
      url.pathname = newPathname;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

// Only run middleware on dashboard routes to optimize performance
export const config = {
  matcher: ['/dashboard/:path*', '/dashboard'],
};
