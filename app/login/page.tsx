'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, AlertCircle } from 'lucide-react';

export default function Login() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        router.replace('/');
      } else {
        const data = await response.json();
        setError(data.message || '密码错误');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('验证失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">欢迎使用</h1>
          <p className="mt-2 text-muted">请输入访问密码继续</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                value={code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
                className="input pl-10"
                placeholder="请输入密码"
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-[rgb(var(--danger))] text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!code || isLoading}
            className="btn btn-primary w-full"
          >
            {isLoading ? '验证中...' : '确认'}
          </button>
        </form>
      </div>
    </div>
  );
} 