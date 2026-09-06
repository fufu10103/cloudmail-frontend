'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CONFIG, API_ENDPOINTS } from '@/lib/config';
import { isLoggedIn, getCurrentUser, authFetch, getAccountId, refreshUserInfo } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import ThemeToggle from '@/components/ThemeToggle';

export default function ComposePage() {
  const router = useRouter();
  const settings = getSettings();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [accountId, setAccountId] = useState(null);
  const [showCc, setShowCc] = useState(false);
  const [cc, setCc] = useState('');

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login');
      return;
    }
    initAccount();
  }, [router]);

  const initAccount = async () => {
    let aid = getAccountId();
    if (!aid) {
      const info = await refreshUserInfo();
      aid = info?.account?.accountId;
    }
    setAccountId(aid);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setError('');

    if (!to || !subject) {
      setError('请填写收件人和主题');
      return;
    }
    if (!accountId) {
      setError('未获取到邮箱账号信息，请重新登录');
      return;
    }

    setSending(true);
    try {
      const receiveEmail = to.split(/[,;]/).map(s => s.trim()).filter(Boolean);
      const res = await authFetch(API_ENDPOINTS.EMAIL_SEND, {
        method: 'POST',
        body: JSON.stringify({
          accountId,
          receiveEmail,
          subject,
          content: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.8; color: #333;">${content.replace(/\n/g, '<br>')}</div>`,
          text: content
        })
      });

      const data = await res.json();
      if (data.code === 200) {
        alert('邮件发送成功！');
        router.push('/mailbox');
      } else {
        setError(data.message || '发送失败');
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setSending(false);
    }
  };

  const siteName = settings.siteName || CONFIG.SITE_NAME;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* 顶栏 */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 md:px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 md:gap-4">
          <Link href="/mailbox" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h1 className="text-base md:text-lg font-semibold text-gray-800 dark:text-gray-100">写邮件</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
              {getCurrentUser()?.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium text-gray-700 dark:text-gray-300 hidden md:inline">{getCurrentUser()}</span>
          </div>
        </div>
      </header>

      {/* 编辑区 */}
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          {error && (
            <div className="mx-4 md:mx-6 mt-5 p-3.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-center gap-2 animate-fade-in">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSend} className="p-4 md:p-6">
            {/* 收件人 */}
            <div className="flex items-center border-b border-gray-100 dark:border-gray-800 py-3">
              <label className="w-16 md:w-20 text-sm font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">收件人</label>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="flex-1 outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-transparent text-sm md:text-base"
                placeholder="输入收件人邮箱，多个用逗号分隔"
                required
              />
              <button
                type="button"
                onClick={() => setShowCc(!showCc)}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 ml-2 transition flex-shrink-0"
              >
                {showCc ? '隐藏抄送' : '添加抄送'}
              </button>
            </div>

            {/* 抄送 */}
            {showCc && (
              <div className="flex items-center border-b border-gray-100 dark:border-gray-800 py-3 animate-fade-in">
                <label className="w-16 md:w-20 text-sm font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">抄送</label>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  className="flex-1 outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-transparent text-sm md:text-base"
                  placeholder="输入抄送邮箱"
                />
              </div>
            )}

            {/* 主题 */}
            <div className="flex items-center border-b border-gray-100 dark:border-gray-800 py-3">
              <label className="w-16 md:w-20 text-sm font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">主题</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="flex-1 outline-none text-gray-800 placeholder-gray-400 bg-transparent text-base"
                placeholder="输入邮件主题"
                required
              />
            </div>

            {/* 正文 */}
            <div className="py-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-72 md:h-96 outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none bg-transparent leading-relaxed text-sm md:text-base"
                placeholder="在这里输入邮件内容..."
              />
            </div>

            {/* 操作栏 */}
            <div className="flex items-center justify-between pt-4 md:pt-5 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-1">
                <button type="button" className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 transition" title="添加附件">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <button type="button" className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 transition" title="插入表情">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button type="button" className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 transition" title="保存草稿">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                <Link href="/mailbox" className="px-4 md:px-5 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition font-medium">
                  取消
                </Link>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 md:px-7 py-2.5 btn-gradient text-white text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center gap-2"
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      发送中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      发送
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          邮件通过 {siteName} 安全加密发送
        </p>
      </div>
    </div>
  );
}
