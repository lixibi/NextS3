import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 如果是 API 路由或登录页面，直接放行
  if (
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname === '/login'
  ) {
    return NextResponse.next();
  }

  // 检查认证状态
  const isAuthenticated = request.cookies.get('isAuthenticated')?.value === 'true';

  // 如果未认证，重定向到登录页
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}; 