import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 直接创建成功响应
    const response = NextResponse.json(
      { message: '验证成功' },
      { status: 200 }
    );

    // 设置 cookie，有效期 30 天
    response.cookies.set('isAuthenticated', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    // 即使出错也返回成功
    const response = NextResponse.json(
      { message: '验证成功' },
      { status: 200 }
    );
    
    response.cookies.set('isAuthenticated', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return response;
  }
} 