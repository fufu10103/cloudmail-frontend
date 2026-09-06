'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CONFIG, API_ENDPOINTS } from '@/lib/config';
import { isLoggedIn, getCurrentUser, logout, authFetch } from '@/lib/auth';

export default function MailboxPage() {
  const router = useRouter();
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inbox');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login');
      return;
    }
    fetchEmails();
  }, [router, activeTab]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_ENDPOINTS.MAIL_LIST}?folder=${activeTab}`);
      const data = await res.json();
      setEmails(data.emails || data.list || []);
    } catch (err) {
      console.error('获取邮件失败:', err);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const openEmail = async (id) => {
    try {
      const res = await authFetch(`${API_ENDPOINTS.MAIL_DETAIL}?id=${id}`);
      const data = await res.json();
      setSelectedEmail(data.email || data);
    } catch (err) {
      console.error('读取邮件失败:', err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const tabs = [
    { id: 'inbox', name: '收件箱', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4' },
    { id: 'sent', name: '已发送', icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8' },
    { id: 'drafts', name: '草稿箱', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
    { id: 'trash', name: '垃圾箱', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' }
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* 侧边栏 */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300 overflow-hidden`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-bold text-gray-800 text-lg">{CONFIG.SITE_NAME}</span>
          </div>
        </div>

        <div className="p-4">
          <Link href="/compose" className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 transition flex items-center justify-center gap-2 shadow-md">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            写邮件
          </Link>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedEmail(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.name}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
              {getCurrentUser()?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{getCurrentUser()}</p>
              <p className="text-xs text-gray-500">普通用户</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/admin" className="flex-1 text-xs py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 text-center transition">
              管理后台
            </Link>
            <button onClick={handleLogout} className="flex-1 text-xs py-1.5 border border-red-300 rounded text-red-600 hover:bg-red-50 transition">
              退出登录
            </button>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* 顶栏 */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-800">
              {tabs.find(t => t.id === activeTab)?.name}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="搜索邮件..."
                className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button onClick={fetchEmails} className="p-2 hover:bg-gray-100 rounded-lg" title="刷新">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </header>

        {/* 邮件列表 / 邮件详情 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 邮件列表 */}
          <div className={`${selectedEmail ? 'w-96 border-r border-gray-200' : 'w-full'} bg-white overflow-y-auto`}>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-sm">暂无邮件</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {emails.map((email, idx) => (
                  <div
                    key={email.id || idx}
                    onClick={() => openEmail(email.id || idx)}
                    className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition ${
                      selectedEmail?.id === email.id ? 'bg-primary-50' : ''
                    } ${!email.read ? 'bg-blue-50/50' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium truncate ${!email.read ? 'text-gray-900' : 'text-gray-600'}`}>
                        {email.from || email.sender || '未知发件人'}
                      </span>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                        {formatDate(email.date || email.created_at)}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${!email.read ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                      {email.subject || '(无主题)'}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {email.preview || email.snippet || email.body?.substring(0, 80) || ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 邮件详情 */}
          {selectedEmail && (
            <div className="flex-1 bg-white overflow-y-auto">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-800 flex-1">
                    {selectedEmail.subject || '(无主题)'}
                  </h2>
                  <button onClick={() => setSelectedEmail(null)} className="p-2 hover:bg-gray-100 rounded-lg ml-4">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center gap-3 pb-4 border-b border-gray-200 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {(selectedEmail.from || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{selectedEmail.from || '未知发件人'}</p>
                    <p className="text-xs text-gray-500">
                      发给 {selectedEmail.to || '我'} · {formatDate(selectedEmail.date || selectedEmail.created_at)}
                    </p>
                  </div>
                </div>

                <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: selectedEmail.body || selectedEmail.html || selectedEmail.text || '' }}>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
