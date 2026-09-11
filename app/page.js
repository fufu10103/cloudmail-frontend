'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSettings } from '@/lib/settings';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 安装向导优先级最高：没完成就先去安装
    const settings = getSettings();
    if (!settings.setupCompleted) {
      router.replace('/setup');
      return;
    }

    // 检查是否已经看过欢迎页
    const welcomeShown = localStorage.getItem('cloudmail_welcome_shown');
    const token = localStorage.getItem('cloudmail_token');

    if (token) {
      router.push('/mailbox');
    } else if (!welcomeShown) {
      router.push('/welcome');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 bg-black rounded-xl flex items-center justify-center animate-pulse">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-gray-400 text-sm">加载中...</p>
      </div>
    </div>
  );
}
