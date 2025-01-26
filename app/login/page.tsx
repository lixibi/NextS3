'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();

  useEffect(() => {
    // 直接设置认证状态并跳转
    localStorage.setItem('isAuthenticated', 'true');
    router.push('/');
    router.refresh();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">正在登录...</p>
    </div>
  );
} 