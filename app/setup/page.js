'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CONFIG } from '@/lib/config';
import { getSettings, saveSettings } from '@/lib/settings';
import ThemeToggle from '@/components/ThemeToggle';

export default function SetupPage() {
  const router = useRouter();
  const settings = getSettings();

  const [siteName, setSiteName] = useState(settings.siteName || 'CloudMail');
  const [apiBase, setApiBase] = useState(settings.apiBase || CONFIG.API_BASE);
  const [domainsText, setDomainsText] = useState((settings.mailDomains || CONFIG.MAIL_DOMAINS).join(', '));
  const [adminEmail, setAdminEmail] = useState(settings.adminEmail || '');
  const [turnstileKey, setTurnstileKey] = useState(settings.turnstileSiteKey || '');
  const [confirmBackend, setConfirmBackend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 已经完成安装的直接去登录页
  useEffect(() => {
    if (settings.setupCompleted) {
      router.replace('/login');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!siteName.trim()) { setError('请填写站点名称'); return; }
    if (!apiBase.trim()) { setError('请填写后端 API 地址'); return; }
    if (!adminEmail.trim() || !adminEmail.includes('@')) { setError('请填写管理员邮箱（完整邮箱地址）'); return; }
    if (!confirmBackend) { setError('请先确认后端 Worker 的环境变量已配置好'); return; }

    const domains = domainsText.split(',').map(s => s.trim()).filter(Boolean);
    if (domains.length === 0) { setError('请至少填写一个邮箱域名'); return; }

    setLoading(true);
    try {
      saveSettings({
        siteName: siteName.trim(),
        apiBase: apiBase.trim().replace(/\/+$/, ''),
        mailDomains: domains,
        mailDomain: domains[0],
        adminEmail: adminEmail.trim().toLowerCase(),
        turnstileSiteKey: turnstileKey.trim(),
        turnstileEnabled: !!turnstileKey.trim(),
        setupCompleted: true
      });
      router.push('/login');
    } catch (err) {
      setError('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 md:py-16">
        {/* 头部 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
            <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2">
            初始化安装
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
            只需一分钟，完成你的专属邮箱基础配置
          </p>
        </div>

        {/* 表单卡片 */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-xl border border-white/50 dark:border-gray-700/50 p-6 md:p-8">
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 站点名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">站点名称</label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition"
                placeholder="CloudMail"
              />
              <p className="mt-1 text-xs text-gray-400">显示在浏览器标题和登录页大标题</p>
            </div>

            {/* 后端 API 地址 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">后端 API 地址</label>
              <input
                type="text"
                value={apiBase}
                onChange={(e) => setApiBase(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono text-sm"
                placeholder="https://your-mail-worker.example.com"
              />
              <p className="mt-1 text-xs text-gray-400">你的 CloudMail 后端 Worker 地址，末尾不要带斜杠</p>
            </div>

            {/* 邮箱域名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">可用邮箱域名</label>
              <input
                type="text"
                value={domainsText}
                onChange={(e) => setDomainsText(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono text-sm"
                placeholder="mail.example.com, mail2.example.com"
              />
              <p className="mt-1 text-xs text-gray-400">逗号分隔，用户注册时只能选这些后缀</p>
            </div>

            {/* 管理员邮箱 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">管理员邮箱</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition"
                placeholder="admin@mail.example.com"
              />
              <p className="mt-1 text-xs text-gray-400">
                这个邮箱必须与后端 Worker 环境变量 <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">admin</code> 的值完全一致
              </p>
            </div>

            {/* Turnstile */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Turnstile Site Key <span className="text-gray-400 font-normal">（可选）</span>
              </label>
              <input
                type="text"
                value={turnstileKey}
                onChange={(e) => setTurnstileKey(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono text-sm"
                placeholder="0x4AAAAAAA...（留空则不启用）"
              />
            </div>

            {/* 后端确认 */}
            <label className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={confirmBackend}
                onChange={(e) => setConfirmBackend(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                我已在 Cloudflare Worker 的 <strong>Settings → Variables</strong> 里配置好这三个环境变量：
                <code className="block mt-1 px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs font-mono">
                  admin = 上面填的管理员邮箱<br/>
                  domain = 允许的邮箱域名列表<br/>
                  jwt_secret = 一串随机密钥
                </code>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>正在保存...</>
              ) : (
                '完成安装，进入登录'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          这些配置只保存在你当前浏览器，换设备需要重新配置
        </p>
      </div>
    </div>
  );
}
