'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { makeEndpoints } from '@/lib/config';
import { isLoggedIn, getCurrentUser, logout, authFetch, isAdmin } from '@/lib/auth';
import { getSettings, saveSettings, resetSettings, applySettings } from '@/lib/settings';
import { formatDate, renderEmailContent } from '@/lib/email';
import ThemeToggle from '@/components/ThemeToggle';

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');

  // 全部邮件
  const [allMails, setAllMails] = useState([]);
  const [mailType, setMailType] = useState('receive');
  const [mailLoading, setMailLoading] = useState(false);
  const [viewMail, setViewMail] = useState(null);
  const [mailSearch, setMailSearch] = useState('');

  // 设置相关状态
  const [settings, setSettingsState] = useState(getSettings());
  const [newDomain, setNewDomain] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const ep = makeEndpoints(settings.apiBase);

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return; }
    if (!isAdmin()) { router.push('/mailbox'); return; }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (activeTab === 'mails') fetchAllMails(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, mailType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${ep.ADMIN_USER_LIST}?num=1&size=50`);
      const data = await res.json();
      if (data.code === 200) {
        setUsers(data.data?.list || []);
        setStats({ total: data.data?.total || 0 });
      }
    } catch (err) {
      console.error('获取管理数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // ============ 全部邮件 ============
  const fetchAllMails = async (reset) => {
    setMailLoading(true);
    try {
      const cursor = reset ? 0 : (allMails[allMails.length - 1]?.emailId || 0);
      let url = `${ep.ADMIN_EMAIL_LIST}?type=${mailType}&size=20&full=0${cursor ? `&emailId=${cursor}` : ''}`;
      if (mailSearch) url += `&subject=${encodeURIComponent(mailSearch)}`;
      const res = await authFetch(url);
      const data = await res.json();
      if (data.code === 200) {
        const list = data.data?.list || [];
        setAllMails(prev => reset ? list : [...prev, ...list]);
      }
    } catch (e) { console.error(e); }
    finally { setMailLoading(false); }
  };

  const handleDeleteMail = async (emailId) => {
    if (!confirm('确定永久删除这封邮件吗？此操作不可恢复！')) return;
    try {
      await authFetch(`${ep.ADMIN_EMAIL_DELETE}?emailIds=${emailId}`, { method: 'DELETE' });
      setAllMails(prev => prev.filter(m => m.emailId !== emailId));
      setViewMail(null);
    } catch (e) { alert('删除失败'); }
  };

  // ============ 用户操作 ============
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!newUser.email || !newUser.password) { setMessage('请填写邮箱和密码'); return; }
    if (newUser.password.length < 6) { setMessage('密码至少6位'); return; }
    try {
      const email = newUser.email.includes('@') ? newUser.email : `${newUser.email}@${settings.mailDomain}`;
      const res = await authFetch(ep.ADMIN_USER_ADD, {
        method: 'POST',
        body: JSON.stringify({ email, password: newUser.password })
      });
      const data = await res.json();
      if (data.code === 200) {
        setMessage('用户创建成功');
        setNewUser({ email: '', password: '' });
        fetchData();
      } else {
        setMessage(data.message || '创建失败');
      }
    } catch (err) { setMessage('网络错误'); }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 0 ? 1 : 0;
    try {
      const res = await authFetch(ep.ADMIN_USER_SET_STATUS, {
        method: 'PUT',
        body: JSON.stringify({ userId: user.userId, status: newStatus })
      });
      const data = await res.json();
      if (data.code === 200) fetchData();
    } catch (err) { console.error('修改状态失败:', err); }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('确定要永久删除这个用户吗？此操作不可恢复！')) return;
    try {
      await authFetch(`${ep.ADMIN_USER_DELETE}?userIds=${userId}`, { method: 'DELETE' });
      fetchData();
    } catch (err) { console.error('删除用户失败:', err); }
  };

  // ============ 设置 ============
  const handleSaveSettings = () => {
    saveSettings(settings);
    applySettings();
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };
  const handleResetSettings = () => {
    if (!confirm('确定要重置所有设置为默认值吗？')) return;
    const defaults = resetSettings();
    setSettingsState(defaults);
    applySettings();
  };
  const handleAddDomain = () => {
    if (!newDomain.trim()) return;
    if (settings.mailDomains.includes(newDomain.trim())) { alert('该域名已存在'); return; }
    setSettingsState({ ...settings, mailDomains: [...settings.mailDomains, newDomain.trim()] });
    setNewDomain('');
  };
  const handleRemoveDomain = (domain) => {
    if (settings.mailDomains.length <= 1) { alert('至少保留一个域名'); return; }
    setSettingsState({ ...settings, mailDomains: settings.mailDomains.filter(d => d !== domain) });
  };
  const handleLogout = () => { logout(); router.push('/login'); };

  const tabs = [
    { id: 'dashboard', name: '概览', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { id: 'users', name: '用户管理', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'mails', name: '全部邮件', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: 'settings', name: '系统设置', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' }
  ];

  const normalUsers = users.filter(u => u.status === 0 && u.isDel === 0);
  const statCards = [
    { label: '总用户数', value: stats.total || users.length || 0, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: 'blue' },
    { label: '正常用户', value: normalUsers.length, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'green' },
    { label: '已禁用', value: users.filter(u => u.status === 1).length, icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636', color: 'red' },
    { label: '累计收件', value: users.reduce((s, u) => s + (u.receiveEmailCount || 0), 0), icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4', color: 'purple' }
  ];
  const colorMap = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    red: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
  };

  // 收发件 Top5 条形图数据
  const topUsers = [...users].sort((a, b) => (b.receiveEmailCount || 0) - (a.receiveEmailCount || 0)).slice(0, 5);
  const maxReceive = Math.max(1, ...topUsers.map(u => u.receiveEmailCount || 0));

  const mailTypeTabs = [
    { id: 'receive', name: '收件' },
    { id: 'send', name: '发件' },
    { id: 'all', name: '全部' },
    { id: 'delete', name: '已删除' },
    { id: 'noone', name: '无人收件' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex transition-colors duration-300">
      <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col shadow-sm fixed md:relative h-full z-30 -translate-x-full md:translate-x-0 transition-transform duration-300" id="admin-sidebar">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <Link href="/mailbox" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <span className="font-bold text-gray-800 dark:text-gray-100 text-lg">管理后台</span>
              <p className="text-xs text-gray-400 dark:text-gray-500">{settings.siteName}</p>
            </div>
            <button onClick={() => document.getElementById('admin-sidebar')?.classList.add('-translate-x-full')} className="md:hidden p-1 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); document.getElementById('admin-sidebar')?.classList.add('-translate-x-full'); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                activeTab === tab.id ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} /></svg>
              {tab.name}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
              {getCurrentUser()?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{getCurrentUser()}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">管理员</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/mailbox" className="flex-1 text-xs py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-center transition">返回邮箱</Link>
            <button onClick={handleLogout} className="flex-1 text-xs py-2 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition">退出</button>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto min-w-0">
        <div className="flex items-center justify-between mb-4 md:hidden">
          <button onClick={() => document.getElementById('admin-sidebar')?.classList.remove('-translate-x-full')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <span className="font-semibold text-gray-800 dark:text-gray-100">管理后台</span>
          <ThemeToggle />
        </div>
        <div className="hidden md:flex justify-end mb-4"><ThemeToggle /></div>

        {loading ? (
          <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
        ) : (
          <>
            {/* ============ 概览 ============ */}
            {activeTab === 'dashboard' && (
              <div className="animate-fade-in">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 md:mb-6">系统概览</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-6 md:mb-8">
                  {statCards.map((card, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 card-hover">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colorMap[card.color]}`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} /></svg>
                      </div>
                      <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{card.value}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                  {/* 收件量 Top5 */}
                  <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">收件量 Top 5</h2>
                    {topUsers.length === 0 ? (
                      <p className="text-gray-400 text-sm py-8 text-center">暂无数据</p>
                    ) : (
                      <div className="space-y-3">
                        {topUsers.map((u, i) => (
                          <div key={u.userId}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-700 dark:text-gray-300 truncate mr-2">{i + 1}. {u.email}</span>
                              <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{u.receiveEmailCount || 0} 封</span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all" style={{ width: `${((u.receiveEmailCount || 0) / maxReceive) * 100}%` }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 最近注册用户 */}
                  <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">最近注册</h2>
                    {users.length === 0 ? (
                      <p className="text-gray-400 text-sm py-8 text-center">暂无用户数据</p>
                    ) : (
                      <div className="space-y-3">
                        {users.slice(0, 5).map((user) => (
                          <div key={user.userId} className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                              {user.email?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{user.email}</p>
                              <p className="text-xs text-gray-400">{user.createTime ? user.createTime.split(' ')[0] : '-'}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs flex-shrink-0 ${user.status === 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                              {user.status === 0 ? '正常' : '禁用'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ============ 用户管理 ============ */}
            {activeTab === 'users' && (
              <div className="animate-fade-in">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 md:mb-6">用户管理</h1>

                <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800 mb-4 md:mb-6">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">添加用户</h2>
                  {message && (
                    <div className={`mb-4 p-3 rounded-xl text-sm ${message.includes('成功') ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'}`}>{message}</div>
                  )}
                  <form onSubmit={handleCreateUser} className="flex gap-4 items-end flex-wrap">
                    <div className="flex-1 min-w-48">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">邮箱</label>
                      <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-blue-500 bg-white dark:bg-gray-800">
                        <input type="text" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="flex-1 outline-none bg-transparent text-gray-800 dark:text-gray-100" placeholder="输入用户名" />
                        <span className="text-gray-400 text-sm">@{settings.mailDomain}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-48">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">密码</label>
                      <input type="password" autoComplete="new-password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" placeholder="至少6位" />
                    </div>
                    <button type="submit" className="px-6 py-2.5 btn-gradient text-white rounded-xl font-medium shadow-md">添加用户</button>
                  </form>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">用户列表（共 {users.length} 人）</h2>
                  </div>
                  {users.length === 0 ? (
                    <div className="p-12 text-center text-gray-400"><p>暂无用户</p></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 dark:bg-gray-800/50">
                          <tr className="text-left text-gray-500 dark:text-gray-400">
                            <th className="px-4 md:px-6 py-3 font-medium">用户</th>
                            <th className="px-4 md:px-6 py-3 font-medium">角色</th>
                            <th className="px-4 md:px-6 py-3 font-medium">状态</th>
                            <th className="px-4 md:px-6 py-3 font-medium">收/发</th>
                            <th className="px-4 md:px-6 py-3 font-medium">邮箱数</th>
                            <th className="px-4 md:px-6 py-3 font-medium">最近活跃</th>
                            <th className="px-4 md:px-6 py-3 font-medium">IP / 设备</th>
                            <th className="px-4 md:px-6 py-3 font-medium text-right">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                          {users.map((user) => (
                            <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className="px-4 md:px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">{user.email?.charAt(0).toUpperCase()}</div>
                                  <div>
                                    <p className="font-medium text-gray-800 dark:text-gray-100">{user.email}</p>
                                    <p className="text-xs text-gray-400">{user.createTime ? user.createTime.split(' ')[0] : ''} 注册</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 md:px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${user.type === 0 ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
                                  {user.type === 0 ? '管理员' : '普通'}
                                </span>
                              </td>
                              <td className="px-4 md:px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${user.status === 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                                  {user.status === 0 ? '正常' : '禁用'}
                                </span>
                              </td>
                              <td className="px-4 md:px-6 py-4 text-gray-600 dark:text-gray-300">
                                <span className="text-blue-600 dark:text-blue-400">{user.receiveEmailCount || 0}</span>
                                <span className="text-gray-300 mx-1">/</span>
                                <span className="text-green-600 dark:text-green-400">{user.sendEmailCount ?? user.sendCount ?? 0}</span>
                              </td>
                              <td className="px-4 md:px-6 py-4 text-gray-500 dark:text-gray-400">{user.accountCount || 1}</td>
                              <td className="px-4 md:px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">{user.activeTime ? formatDate(user.activeTime) : '-'}</td>
                              <td className="px-4 md:px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">
                                <div>{user.activeIp || '-'}</div>
                                <div className="text-gray-400">{[user.os, user.browser].filter(Boolean).join(' · ') || user.device || '-'}</div>
                              </td>
                              <td className="px-4 md:px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button onClick={() => handleToggleStatus(user)} className={`px-3 py-1.5 text-xs border rounded-xl transition ${user.status === 0 ? 'border-yellow-200 dark:border-yellow-800 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20' : 'border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'}`}>
                                    {user.status === 0 ? '禁用' : '启用'}
                                  </button>
                                  <button onClick={() => handleDeleteUser(user.userId)} className="px-3 py-1.5 text-xs border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition">删除</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============ 全部邮件 ============ */}
            {activeTab === 'mails' && (
              <div className="animate-fade-in">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 md:mb-6">全部邮件</h1>

                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-2">
                    {mailTypeTabs.map(t => (
                      <button key={t.id} onClick={() => { setMailType(t.id); setAllMails([]); }} className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${mailType === t.id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{t.name}</button>
                    ))}
                    <div className="flex-1"></div>
                    <input type="text" value={mailSearch} onChange={(e) => setMailSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchAllMails(true)} placeholder="按主题搜索" className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 w-40" />
                  </div>

                  {mailLoading && allMails.length === 0 ? (
                    <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
                  ) : allMails.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 text-sm">暂无邮件</div>
                  ) : (
                    <div className="divide-y divide-gray-50 dark:divide-gray-800">
                      {allMails.map(mail => (
                        <div key={mail.emailId} onClick={() => setViewMail(mail)} className="px-4 md:px-6 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{mail.userEmail || '-'}</span>
                              <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(mail.createTime)}</span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{mail.subject || '(无主题)'}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${mail.type === 1 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                            {mail.type === 1 ? '发件' : '收件'}
                          </span>
                        </div>
                      ))}
                      <div className="p-4 text-center">
                        <button onClick={() => fetchAllMails(false)} disabled={mailLoading} className="px-6 py-2 text-sm text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50">
                          {mailLoading ? '加载中...' : '加载更多'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 邮件详情弹窗 */}
                {viewMail && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewMail(null)}>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                      <div className="p-5 md:p-6">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 break-all">{viewMail.subject || '(无主题)'}</h3>
                          <button onClick={() => setViewMail(null)} className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 space-y-1">
                          <p>所属用户：{viewMail.userEmail}</p>
                          <p>{viewMail.type === 1 ? `收件人：${viewMail.toEmail}` : `发件人：${viewMail.sendEmail || viewMail.name}`} · {viewMail.createTime}</p>
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-gray-800 pt-4 break-words" dangerouslySetInnerHTML={{ __html: renderEmailContent(viewMail.content || `<p>${viewMail.text || ''}</p>`, settings.apiBase) }} />
                        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
                          <button onClick={() => handleDeleteMail(viewMail.emailId)} className="px-4 py-2 text-sm border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20">永久删除</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ============ 系统设置 ============ */}
            {activeTab === 'settings' && (
              <div className="animate-fade-in">
                <div className="flex items-center justify-between mb-4 md:mb-6 flex-col sm:flex-row gap-3">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">系统设置</h1>
                  <div className="flex gap-3">
                    <button onClick={handleResetSettings} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">重置默认</button>
                    <button onClick={handleSaveSettings} className="px-6 py-2 btn-gradient text-white rounded-xl font-medium shadow-md flex items-center gap-2">
                      {settingsSaved ? (<><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>已保存</>) : '保存设置'}
                    </button>
                  </div>
                </div>

                <div className="space-y-4 md:space-y-6">
                  {/* 基本设置 */}
                  <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 md:mb-5">基本设置</h2>
                    <div className="space-y-4 md:space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">站点名称</label>
                        <input type="text" value={settings.siteName} onChange={(e) => setSettingsState({ ...settings, siteName: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" placeholder="输入站点名称" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API 地址</label>
                        <input type="text" value={settings.apiBase} onChange={(e) => setSettingsState({ ...settings, apiBase: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" placeholder="https://api.example.com" />
                        <p className="text-xs text-gray-400 mt-1">CloudMail 后端 API 地址，不要加末尾斜杠</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">默认邮箱域名</label>
                        <select value={settings.mailDomain} onChange={(e) => setSettingsState({ ...settings, mailDomain: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100">
                          {settings.mailDomains.map((d) => (<option key={d} value={d}>{d}</option>))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 域名管理 */}
                  <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 md:mb-5">域名管理</h2>
                    <div className="flex gap-3 mb-4 flex-col sm:flex-row">
                      <input type="text" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" placeholder="输入新域名，例如 example.com" />
                      <button onClick={handleAddDomain} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition">添加</button>
                    </div>
                    <div className="space-y-2">
                      {settings.mailDomains.map((domain) => (
                        <div key={domain} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{domain}</span>
                            {domain === settings.mailDomain && (<span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full flex-shrink-0">默认</span>)}
                          </div>
                          <button onClick={() => handleRemoveDomain(domain)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Turnstile */}
                  <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 md:mb-5">Cloudflare Turnstile 人机验证</h2>
                    <div className="space-y-4 md:space-y-5">
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">启用人机验证</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">注册时需要完成验证，防止恶意注册</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                          <input type="checkbox" checked={settings.turnstileEnabled} onChange={(e) => setSettingsState({ ...settings, turnstileEnabled: e.target.checked })} className="sr-only peer" />
                          <div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Turnstile Site Key（公钥，前端用）</label>
                        <input type="text" value={settings.turnstileSiteKey} onChange={(e) => setSettingsState({ ...settings, turnstileSiteKey: e.target.value })} disabled={!settings.turnstileEnabled} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 dark:disabled:bg-gray-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" placeholder="0x..." />
                        <p className="text-xs text-gray-400 mt-1">在 Cloudflare Dashboard → Turnstile 创建站点获取；Secret Key（密钥）必须填在 Pages 环境变量 TURNSTILE_SECRET_KEY，切勿写进前端。</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
