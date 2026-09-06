'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CONFIG, API_ENDPOINTS } from '@/lib/config';
import { isLoggedIn, getCurrentUser, logout, authFetch, getAccountId, refreshUserInfo, getUserInfo } from '@/lib/auth';
import { sanitizeHtml } from '@/lib/sanitize';
import { getSettings } from '@/lib/settings';

export default function MailboxPage() {
  const router = useRouter();
  const settings = getSettings();
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inbox');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [accountId, setAccountId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login');
      return;
    }
    setUserInfo(getUserInfo());
    initAccount();
  }, [router]);

  useEffect(() => {
    if (accountId) {
      fetchEmails();
    }
  }, [accountId, activeTab]);

  const initAccount = async () => {
    let aid = getAccountId();
    if (!aid) {
      const info = await refreshUserInfo();
      aid = info?.account?.accountId;
      setUserInfo(info);
    }
    if (aid) {
      setAccountId(aid);
    } else {
      setLoading(false);
    }
  };

  const fetchEmails = async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const type = activeTab === 'sent' ? 1 : 0;
      const url = `${API_ENDPOINTS.EMAIL_LIST}?accountId=${accountId}&type=${type}&size=30&full=1`;
      const res = await authFetch(url);
      const data = await res.json();
      if (data.code === 200) {
        setEmails(data.data?.list || []);
      } else {
        setEmails([]);
      }
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

  const openEmail = (email) => {
    setSelectedEmail(email);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr.replace(' ', 'T'));
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const filteredEmails = emails.filter(email => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      email.subject?.toLowerCase().includes(q) ||
      email.sendEmail?.toLowerCase().includes(q) ||
      email.name?.toLowerCase().includes(q) ||
      email.text?.toLowerCase().includes(q)
    );
  });

  const unreadCount = emails.filter(e => e.unread === 0).length;
  const siteName = settings.siteName || CONFIG.SITE_NAME;

  const tabs = [
    { id: 'inbox', name: '收件箱', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4', count: unreadCount },
    { id: 'sent', name: '已发送', icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8', count: 0 }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 侧边栏 */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-white border-r border-gray-100 flex flex-col transition-all duration-300 overflow-hidden shadow-sm`}>
        <div className="p-5 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-gray-800 text-lg">{siteName}</span>
              <p className="text-xs text-gray-400">邮箱</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <Link href="/compose" className="w-full btn-gradient text-white py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 shadow-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            写邮件
          </Link>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedEmail(null); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              <span className="flex-1 text-left">{tab.name}</span>
              {tab.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-50">
          <div className="flex items-center gap-3 mb-3 p-2 rounded-xl bg-gray-50">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {getCurrentUser()?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{getCurrentUser()}</p>
              <p className="text-xs text-gray-400">{userInfo?.role?.name || '普通用户'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/admin" className="flex-1 text-xs py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-center transition font-medium">
              管理后台
            </Link>
            <button onClick={handleLogout} className="flex-1 text-xs py-2 border border-red-200 rounded-xl text-red-600 hover:bg-red-50 transition font-medium">
              退出登录
            </button>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* 顶栏 */}
        <header className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-xl transition">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-800">
              {tabs.find(t => t.id === activeTab)?.name}
              {filteredEmails.length > 0 && <span className="text-sm text-gray-400 ml-2">({filteredEmails.length})</span>}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索邮件..."
                className="w-56 pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-gray-50 focus:bg-white"
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button onClick={fetchEmails} className="p-2 hover:bg-gray-100 rounded-xl transition" title="刷新">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </header>

        {/* 邮件列表 / 邮件详情 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 邮件列表 */}
          <div className={`${selectedEmail ? 'w-96 border-r border-gray-100' : 'w-full'} bg-white overflow-y-auto`}>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-sm font-medium">暂无邮件</p>
                <p className="text-xs text-gray-400 mt-1">{searchQuery ? '没有找到匹配的邮件' : '新邮件会出现在这里'}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredEmails.map((email) => (
                  <div
                    key={email.emailId}
                    onClick={() => openEmail(email)}
                    className={`px-4 py-3.5 cursor-pointer transition border-l-4 ${
                      selectedEmail?.emailId === email.emailId
                        ? 'bg-blue-50 border-l-blue-500'
                        : email.unread === 0
                        ? 'bg-blue-50/30 border-l-transparent hover:bg-gray-50'
                        : 'border-l-transparent hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {email.unread === 0 && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>}
                        <span className={`text-sm truncate ${email.unread === 0 ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                          {activeTab === 'sent' ? (email.toEmail || '未知收件人') : (email.sendEmail || email.name || '未知发件人')}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-2 flex-shrink-0">
                        {formatDate(email.createTime)}
                      </span>
                    </div>
                    <p className={`text-sm truncate mb-1 ${email.unread === 0 ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                      {email.subject || '(无主题)'}
                    </p>
                    <p className="text-xs text-gray-400 truncate line-clamp-1">
                      {email.text || email.content?.replace(/<[^>]*>/g, '').substring(0, 100) || ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 邮件详情 */}
          {selectedEmail && (
            <div className="flex-1 bg-white overflow-y-auto animate-fade-in">
              <div className="p-8 max-w-4xl mx-auto">
                <div className="flex items-start justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 flex-1 leading-tight">
                    {selectedEmail.subject || '(无主题)'}
                  </h2>
                  <div className="flex items-center gap-2 ml-4">
                    <Link href="/compose" className="p-2 hover:bg-gray-100 rounded-xl transition" title="回复">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </Link>
                    <button onClick={() => setSelectedEmail(null)} className="p-2 hover:bg-gray-100 rounded-xl transition">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 pb-5 border-b border-gray-100 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-md">
                    {(activeTab === 'sent' ? (selectedEmail.toEmail || '?') : (selectedEmail.sendEmail || selectedEmail.name || '?')).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-gray-800">
                      {activeTab === 'sent' ? `发给 ${selectedEmail.toEmail}` : (selectedEmail.sendEmail || selectedEmail.name || '未知发件人')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {activeTab === 'sent' ? `发件人：${getCurrentUser()}` : `收件人：${selectedEmail.toEmail || getCurrentUser()}`}
                      <span className="mx-2">·</span>
                      {selectedEmail.createTime}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {selectedEmail.attList && selectedEmail.attList.length > 0 && (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-gray-600">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        {selectedEmail.attList.length} 个附件
                      </span>
                    )}
                  </div>
                </div>

                {/* 邮件正文 */}
                <div
                  className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                  style={{ fontSize: '15px', lineHeight: '1.8' }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedEmail.content || selectedEmail.text || '') }}
                />

                {/* 附件 */}
                {selectedEmail.attList && selectedEmail.attList.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <p className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      附件 ({selectedEmail.attList.length})
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedEmail.attList.map((att, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition cursor-pointer border border-gray-100">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 truncate">{att.filename}</p>
                            <p className="text-xs text-gray-400">{att.mimeType} · {(att.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
