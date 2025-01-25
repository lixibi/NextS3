import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();
    const correctCode = process.env.CODE;

    if (!correctCode) {
      return NextResponse.json(
        { message: '服务器配置错误' },
        { status: 500 }
      );
    }

    if (code !== correctCode) {
      return NextResponse.json(
        { message: '密码错误' },
        { status: 401 }
      );
    }

    // 创建响应
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
    return NextResponse.json(
      { message: '验证失败' },
      { status: 500 }
    );
  }
} 