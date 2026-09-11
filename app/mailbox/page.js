'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CONFIG, makeEndpoints } from '@/lib/config';
import { isLoggedIn, getCurrentUser, logout, authFetch, getAccountId, refreshUserInfo, getUserInfo, isAdmin } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { formatDate, formatFileSize, extractVerifyCode, markEmailsRead, toggleStar, deleteEmails, renderEmailContent, getAttUrl } from '@/lib/email';
import ThemeToggle from '@/components/ThemeToggle';

export default function MailboxPage() {
  const router = useRouter();
  const settings = getSettings();
  const ep = makeEndpoints(settings.apiBase);
  const siteName = settings.siteName || CONFIG.SITE_NAME;

  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState('inbox');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountId, setAccountId] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [toast, setToast] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const listRef = useRef(null);

  // ============ 初始化 ============
  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login');
      return;
    }
    setUserInfo(getUserInfo());
    initAccount();
    requestNotifyPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // 切换 tab / 账号时重新加载
  useEffect(() => {
    if (accountId) {
      reloadEmails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, activeTab]);

  const initAccount = async () => {
    let aid = getAccountId();
    if (!aid) {
      const info = await refreshUserInfo();
      aid = info?.account?.accountId;
      setUserInfo(info);
    }
    fetchAccounts();
    if (aid) setAccountId(aid);
    else setLoading(false);
  };

  // 获取多邮箱账号列表
  const fetchAccounts = async () => {
    try {
      const res = await authFetch(`${ep.ACCOUNT_LIST}?size=30`);
      const data = await res.json();
      if (data.code === 200 && Array.isArray(data.data)) {
        setAccounts(data.data);
      }
    } catch (e) {
      console.warn('获取账号列表失败:', e);
    }
  };

  // ============ 邮件加载（游标分页）============
  const buildListUrl = (cursorId) => {
    if (activeTab === 'starred') {
      return `${ep.STAR_LIST}?size=20&full=1${cursorId ? `&emailId=${cursorId}` : ''}`;
    }
    const type = activeTab === 'sent' ? 1 : 0;
    return `${ep.EMAIL_LIST}?accountId=${accountId}&type=${type}&size=20&full=1${cursorId ? `&emailId=${cursorId}` : ''}`;
  };

  const reloadEmails = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setSelectedEmail(null);
      setSelectedIds(new Set());
    }
    setHasMore(true);
    try {
      const res = await authFetch(buildListUrl(0));
      const data = await res.json();
      if (data.code === 200) {
        const list = data.data?.list || [];
        setEmails(list);
        setHasMore(list.length >= 20);
      } else if (!silent) {
        setEmails([]);
      }
    } catch (err) {
      console.error('获取邮件失败:', err);
      if (!silent) setEmails([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadMore = async () => {
    if (emails.length === 0 || loadingMore) return;
    setLoadingMore(true);
    const cursor = emails[emails.length - 1].emailId;
    try {
      const res = await authFetch(buildListUrl(cursor));
      const data = await res.json();
      if (data.code === 200) {
        const list = data.data?.list || [];
        setEmails(prev => [...prev, ...list]);
        setHasMore(list.length >= 20);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  // ============ 自动刷新 + 桌面通知 ============
  const latestIdRef = useRef(0);
  useEffect(() => {
    latestIdRef.current = emails[0]?.emailId || 0;
  }, [emails]);

  const checkNewMail = useCallback(async () => {
    if (!accountId || activeTab !== 'inbox' || document.visibilityState !== 'visible') return;
    try {
      const res = await authFetch(`${ep.EMAIL_LATEST}?accountId=${accountId}&emailId=${latestIdRef.current}`);
      const data = await res.json();
      if (data.code === 200 && Array.isArray(data.data) && data.data.length > 0) {
        const newMails = data.data;
        // 桌面通知
        if (Notification.permission === 'granted') {
          newMails.slice(0, 3).forEach(m => {
            new Notification('收到新邮件', {
              body: `${m.sendEmail || m.name || '未知发件人'}：${m.subject || '(无主题)'}`,
              tag: 'cloudmail-' + m.emailId
            });
          });
        }
        reloadEmails(true);
      }
    } catch (e) { /* 静默 */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, activeTab]);

  useEffect(() => {
    if (!CONFIG.REFRESH_INTERVAL) return;
    const timer = setInterval(checkNewMail, CONFIG.REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [checkNewMail]);

  const requestNotifyPermission = () => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      // 不主动弹窗，等用户操作时再请求
    }
  };

  const enableNotify = () => {
    if (typeof Notification !== 'undefined') {
      Notification.requestPermission();
      showToast('已开启新邮件通知');
    }
  };

  // ============ 邮件操作 ============
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const openEmail = async (email) => {
    setSelectedEmail(email);
    setCopiedCode(false);
    // 自动标记已读
    if (email.unread === 0) {
      try {
        await markEmailsRead([email.emailId]);
        setEmails(prev => prev.map(e => e.emailId === email.emailId ? { ...e, unread: 1 } : e));
      } catch (e) { /* 忽略 */ }
    }
  };

  const handleToggleStar = async (email, e) => {
    if (e) e.stopPropagation();
    const willStar = !email.isStar;
    // 乐观更新
    setEmails(prev => prev.map(x => x.emailId === email.emailId ? { ...x, isStar: willStar ? 1 : 0 } : x));
    if (selectedEmail?.emailId === email.emailId) {
      setSelectedEmail({ ...selectedEmail, isStar: willStar ? 1 : 0 });
    }
    try {
      await toggleStar(email, willStar);
      if (activeTab === 'starred' && !willStar) {
        setEmails(prev => prev.filter(x => x.emailId !== email.emailId));
      }
    } catch (err) {
      showToast('操作失败');
      setEmails(prev => prev.map(x => x.emailId === email.emailId ? { ...x, isStar: willStar ? 0 : 1 } : x));
    }
  };

  const handleDelete = async (emailIds) => {
    if (!emailIds || emailIds.length === 0) return;
    if (!window.confirm(`确定删除选中的 ${emailIds.length} 封邮件吗？`)) return;
    const ok = await deleteEmails(emailIds);
    if (ok) {
      setEmails(prev => prev.filter(e => !emailIds.includes(e.emailId)));
      if (selectedEmail && emailIds.includes(selectedEmail.emailId)) setSelectedEmail(null);
      setSelectedIds(new Set());
      showToast('已删除');
    } else {
      showToast('删除失败');
    }
  };

  const handleBatchRead = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await markEmailsRead(ids);
    setEmails(prev => prev.map(e => ids.includes(e.emailId) ? { ...e, unread: 1 } : e));
    setSelectedIds(new Set());
    showToast('已标记为已读');
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // ============ 验证码 ============
  const verifyCode = selectedEmail ? extractVerifyCode(selectedEmail) : null;
  const copyCode = () => {
    if (!verifyCode) return;
    navigator.clipboard?.writeText(verifyCode);
    setCopiedCode(true);
    showToast('验证码已复制');
    setTimeout(() => setCopiedCode(false), 1500);
  };

  // ============ 键盘快捷键 ============
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') { setSelectedEmail(null); return; }
      if (!emails.length) return;
      const list = filteredEmails;
      const idx = selectedEmail ? list.findIndex(x => x.emailId === selectedEmail.emailId) : -1;
      if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = list[Math.min(idx + 1, list.length - 1)] || list[0];
        if (next) openEmail(next);
      } else if (e.key === 'k' || e.key === 'K' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = list[Math.max(idx - 1, 0)];
        if (prev) openEmail(prev);
      } else if ((e.key === 'd' || e.key === 'Delete') && selectedEmail) {
        handleDelete([selectedEmail.emailId]);
      } else if ((e.key === 's' || e.key === 'S') && selectedEmail) {
        handleToggleStar(selectedEmail);
      } else if ((e.key === 'r' || e.key === 'R') && selectedEmail) {
        router.push(`/compose?reply=${selectedEmail.emailId}&to=${encodeURIComponent(selectedEmail.sendEmail || '')}`);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emails, selectedEmail, searchQuery]);

  // ============ 筛选 ============
  const filteredEmails = emails.filter(email => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      email.subject?.toLowerCase().includes(q) ||
      email.sendEmail?.toLowerCase().includes(q) ||
      email.toEmail?.toLowerCase().includes(q) ||
      email.name?.toLowerCase().includes(q) ||
      email.text?.toLowerCase().includes(q)
    );
  });

  const unreadCount = emails.filter(e => e.unread === 0).length;
  const tabs = [
    { id: 'inbox', name: '收件箱', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4', count: unreadCount },
    { id: 'sent', name: '已发送', icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8', count: 0 },
    { id: 'starred', name: '星标邮件', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', count: 0 }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex transition-colors duration-300">
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* 侧边栏 */}
      <aside className={`${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'} md:translate-x-0 fixed md:relative z-30 h-full bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col transition-all duration-300 overflow-hidden shadow-sm`}>
        <div className="p-5 border-b border-gray-50 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-gray-800 dark:text-gray-100 text-lg">{siteName}</span>
              <p className="text-xs text-gray-400 dark:text-gray-500">邮箱</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
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

        {/* 多账号切换 */}
        {accounts.length > 1 && (
          <div className="px-4 pb-3">
            <select
              value={accountId || ''}
              onChange={(e) => setAccountId(Number(e.target.value))}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {accounts.map(a => (
                <option key={a.accountId} value={a.accountId}>{a.email}</option>
              ))}
            </select>
          </div>
        )}

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedEmail(null); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              <span className="flex-1 text-left">{tab.name}</span>
              {tab.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}

          <Link href="/settings" className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            个人设置
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-50 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-3 p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {getCurrentUser()?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{getCurrentUser()}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{userInfo?.role?.name || '普通用户'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isAdmin() && (
              <Link href="/admin" className="flex-1 text-xs py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-center transition font-medium">
                管理后台
              </Link>
            )}
            <button onClick={handleLogout} className={`text-xs py-2 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition font-medium ${isAdmin() ? 'flex-1' : 'w-full'}`}>
              退出登录
            </button>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0 h-screen">
        {/* 顶栏 */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 md:px-6 py-3.5 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition md:hidden">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-base md:text-lg font-semibold text-gray-800 dark:text-gray-100">
              {tabs.find(t => t.id === activeTab)?.name}
              {filteredEmails.length > 0 && <span className="text-sm text-gray-400 dark:text-gray-500 ml-2">({filteredEmails.length})</span>}
            </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative hidden sm:block">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索邮件..."
                className="w-40 md:w-56 pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button onClick={enableNotify} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition hidden sm:block" title="开启新邮件通知">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <ThemeToggle />
            <button onClick={reloadEmails} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition" title="刷新">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </header>

        {/* 批量操作栏 */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-800 px-4 md:px-6 py-2.5 flex items-center gap-3 flex-shrink-0">
            <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">已选 {selectedIds.size} 封</span>
            <button onClick={handleBatchRead} className="text-xs px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">标为已读</button>
            <button onClick={() => handleDelete(Array.from(selectedIds))} className="text-xs px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600">删除</button>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs px-3 py-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">取消</button>
          </div>
        )}

        {/* 邮件列表 / 详情 */}
        <div className="flex-1 flex overflow-hidden flex-col md:flex-row">
          {/* 邮件列表 */}
          <div ref={listRef} className={`${selectedEmail ? 'hidden md:block w-96 border-r border-gray-100 dark:border-gray-800' : 'w-full'} bg-white dark:bg-gray-900 overflow-y-auto`}>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500 px-4">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-sm font-medium">暂无邮件</p>
                <p className="text-xs text-gray-400 mt-1">{searchQuery ? '没有找到匹配的邮件' : '新邮件会出现在这里'}</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {filteredEmails.map((email) => (
                    <div
                      key={email.emailId}
                      onClick={() => openEmail(email)}
                      className={`px-4 py-3.5 cursor-pointer transition border-l-4 flex gap-2 ${
                        selectedEmail?.emailId === email.emailId
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-blue-500'
                          : email.unread === 0
                          ? 'bg-blue-50/30 dark:bg-blue-900/10 border-l-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          : 'border-l-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(email.emailId)}
                        onChange={() => toggleSelect(email.emailId)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 flex-shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <button onClick={(e) => handleToggleStar(email, e)} className="flex-shrink-0" title={email.isStar ? '取消星标' : '加星标'}>
                              <svg className={`w-4 h-4 ${email.isStar ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            </button>
                            {email.unread === 0 && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>}
                            <span className={`text-sm truncate ${email.unread === 0 ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}>
                              {activeTab === 'sent' ? (email.toEmail || '未知收件人') : (email.sendEmail || email.name || '未知发件人')}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">{formatDate(email.createTime)}</span>
                        </div>
                        <p className={`text-sm truncate mb-1 ${email.unread === 0 ? 'font-medium text-gray-800 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}>
                          {email.subject || '(无主题)'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate line-clamp-1">
                          {email.text || email.content?.replace(/<[^>]*>/g, '').substring(0, 100) || ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* 加载更多 */}
                {hasMore && (
                  <div className="p-4 text-center">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="px-6 py-2 text-sm text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition disabled:opacity-50"
                    >
                      {loadingMore ? '加载中...' : '加载更多'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 邮件详情 */}
          {selectedEmail ? (
            <div className="flex-1 bg-white dark:bg-gray-900 overflow-y-auto animate-fade-in w-full">
              <div className="p-4 md:p-8 max-w-4xl mx-auto">
                <div className="flex items-start justify-between mb-4 md:mb-6 gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button onClick={() => setSelectedEmail(null)} className="md:hidden p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition flex-shrink-0">
                      <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 flex-1 leading-tight break-all">
                      {selectedEmail.subject || '(无主题)'}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleToggleStar(selectedEmail)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition" title="星标(S)">
                      <svg className={`w-5 h-5 ${selectedEmail.isStar ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                    <Link href={`/compose?reply=${selectedEmail.emailId}&to=${encodeURIComponent(activeTab === 'sent' ? selectedEmail.toEmail : selectedEmail.sendEmail || '')}`} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition" title="回复(R)">
                      <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </Link>
                    <button onClick={() => handleDelete([selectedEmail.emailId])} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition" title="删除(D)">
                      <svg className="w-5 h-5 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 验证码一键提取 */}
                {verifyCode && (
                  <div className="mb-5 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-0.5">识别到验证码</p>
                        <p className="text-2xl font-bold tracking-[0.3em] text-gray-800 dark:text-gray-100">{verifyCode}</p>
                      </div>
                    </div>
                    <button onClick={copyCode} className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition flex-shrink-0">
                      {copiedCode ? '已复制 ✓' : '一键复制'}
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3 md:gap-4 pb-4 md:pb-5 border-b border-gray-100 dark:border-gray-800 mb-4 md:mb-6">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-base md:text-lg shadow-md flex-shrink-0">
                    {(activeTab === 'sent' ? (selectedEmail.toEmail || '?') : (selectedEmail.sendEmail || selectedEmail.name || '?')).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 truncate">
                      {activeTab === 'sent' ? `发给 ${selectedEmail.toEmail}` : (selectedEmail.sendEmail || selectedEmail.name || '未知发件人')}
                    </p>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate">
                      {activeTab === 'sent' ? `发件人：${getCurrentUser()}` : `收件人：${selectedEmail.toEmail || getCurrentUser()}`}
                      <span className="mx-1.5">·</span>
                      {selectedEmail.createTime}
                    </p>
                  </div>
                  {selectedEmail.attList && selectedEmail.attList.length > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-300 flex-shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {selectedEmail.attList.length}
                    </span>
                  )}
                </div>

                {/* 邮件正文 */}
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed break-words"
                  style={{ fontSize: '15px', lineHeight: '1.8' }}
                  dangerouslySetInnerHTML={{ __html: renderEmailContent(selectedEmail.content || selectedEmail.text ? (selectedEmail.content || `<p>${selectedEmail.text}</p>`) : '', settings.apiBase) }}
                />

                {/* 附件 */}
                {selectedEmail.attList && selectedEmail.attList.length > 0 && (
                  <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 md:mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      附件 ({selectedEmail.attList.length})
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedEmail.attList.map((att, idx) => (
                        <a
                          key={idx}
                          href={getAttUrl(att, settings.apiBase)}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={att.filename}
                          className="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer border border-gray-100 dark:border-gray-700 group"
                        >
                          <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                            <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{att.filename}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{formatFileSize(att.size)}</p>
                          </div>
                          <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center text-gray-300 dark:text-gray-600">
              <div className="text-center">
                <svg className="w-24 h-24 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">选择一封邮件阅读</p>
                <p className="text-xs mt-2 text-gray-300 dark:text-gray-600">快捷键：J/K 切换 · S 星标 · R 回复 · D 删除</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Toast 提示 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-xl shadow-2xl animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
