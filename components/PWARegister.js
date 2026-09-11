'use client';

import { useEffect } from 'react';

// 在浏览器端注册 Service Worker，启用 PWA 安装能力
export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    // 仅在 https 或 localhost 下可用
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isSecure) return;

    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service Worker 注册失败:', err);
      });
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
