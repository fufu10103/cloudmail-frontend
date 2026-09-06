'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CONFIG, API_ENDPOINTS } from '@/lib/config';
import { isLoggedIn, getCurrentUser, authFetch } from '@/lib/auth';

export default function ComposePage() {
  const router = useRouter();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login');
    }
  }, [router]);

  const handleSend = async (e) => {
    e.preventDefault();
    setError('');

    if (!to || !subject) {
      setError('请填写收件人和主题');
      return;
    }

    setSending(true);
    try {
      const res = await authFetch(API_ENDPOINTS.MAIL_SEND, {
        method: 'POST',
        body: JSON.stringify({
          to: to.includes('@') ? to : `${to}@${CONFIG.MAIL_DOMAIN}`,
          subject,
          body
        })
      });

      if (res.ok) {
        alert('邮件发送成功！');
        router.push('/mailbox');
      } else {
        const data = await res.json();
        setError(data.message || '发送失败');
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶栏 */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/mailbox" className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-gray-800">写邮件</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>发件人：</span>
          <span className="font-medium text-gray-700">{getCurrentUser()}</span>
        </div>
      </header>

      {/* 编辑区 */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSend} className="p-6">
            {/* 收件人 */}
            <div className="flex items-center border-b border-gray-200 py-3">
              <label className="w-20 text-sm font-medium text-gray-500">收件人</label>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="flex-1 outline-none text-gray-800 placeholder-gray-400"
                placeholder="输入收件人邮箱"
                required
              />
            </div>

            {/* 抄送/密送 切换 */}
            <div className="flex items-center border-b border-gray-200 py-3">
              <label className="w-20 text-sm font-medium text-gray-500">主题</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="flex-1 outline-none text-gray-800 placeholder-gray-400"
                placeholder="输入邮件主题"
                required
              />
            </div>

            {/* 正文 */}
            <div className="py-4">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full h-80 outline-none text-gray-800 placeholder-gray-400 resize-none"
                placeholder="在这里输入邮件内容..."
              />
            </div>

            {/* 操作栏 */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <button type="button" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500" title="添加附件">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <button type="button" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500" title="插入表情">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <Link href="/mailbox" className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">
                  取消
                </Link>
                <button
                  type="button"
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  存草稿
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-6 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:bg-primary-400 transition shadow-md flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  {sending ? '发送中...' : '发送'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
