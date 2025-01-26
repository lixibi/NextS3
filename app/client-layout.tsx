'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (!isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
  }, [pathname, router]);

  return <>{children}</>;
} 