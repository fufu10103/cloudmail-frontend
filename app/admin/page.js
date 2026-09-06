'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CONFIG, API_ENDPOINTS } from '@/lib/config';
import { isLoggedIn, getCurrentUser, logout, authFetch } from '@/lib/auth';
import { getSettings, saveSettings, resetSettings, applySettings } from '@/lib/settings';
import ThemeToggle from '@/components/ThemeToggle';

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');

  // 设置相关状态
  const [settings, setSettingsState] = useState(getSettings());
  const [newDomain, setNewDomain] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [router, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_ENDPOINTS.ADMIN_USER_LIST}?num=1&size=50`);
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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!newUser.email || !newUser.password) {
      setMessage('请填写邮箱和密码');
      return;
    }
    if (newUser.password.length < 6) {
      setMessage('密码至少6位');
      return;
    }
    try {
      const email = newUser.email.includes('@') ? newUser.email : `${newUser.email}@${settings.mailDomain}`;
      const res = await authFetch(API_ENDPOINTS.ADMIN_USER_ADD, {
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
    } catch (err) {
      setMessage('网络错误');
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 0 ? 1 : 0;
    try {
      const res = await authFetch(API_ENDPOINTS.ADMIN_USER_SET_STATUS, {
        method: 'PUT',
        body: JSON.stringify({ userId: user.userId, status: newStatus })
      });
      const data = await res.json();
      if (data.code === 200) {
        fetchData();
      }
    } catch (err) {
      console.error('修改状态失败:', err);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('确定要永久删除这个用户吗？此操作不可恢复！')) return;
    try {
      await authFetch(`${API_ENDPOINTS.ADMIN_USER_DELETE}?userIds=${userId}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error('删除用户失败:', err);
    }
  };

  // 设置相关函数
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
    if (settings.mailDomains.includes(newDomain.trim())) {
      alert('该域名已存在');
      return;
    }
    setSettingsState({
      ...settings,
      mailDomains: [...settings.mailDomains, newDomain.trim()]
    });
    setNewDomain('');
  };

  const handleRemoveDomain = (domain) => {
    if (settings.mailDomains.length <= 1) {
      alert('至少保留一个域名');
      return;
    }
    setSettingsState({
      ...settings,
      mailDomains: settings.mailDomains.filter(d => d !== domain)
    });
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const tabs = [
    { id: 'dashboard', name: '概览', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { id: 'users', name: '用户管理', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'settings', name: '系统设置', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' }
  ];

  const statCards = [
    { label: '总用户数', value: stats.total || users.length || 0, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: 'blue' },
    { label: '正常用户', value: users.filter(u => u.status === 0 && u.isDel === 0).length, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'green' },
    { label: '已禁用', value: users.filter(u => u.status === 1).length, icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636', color: 'red' },
    { label: '管理员', value: users.filter(u => u.type === 0).length, icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: 'purple' }
  ];

  const colorMap = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    red: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex transition-colors duration-300">
      {/* 移动端遮罩 */}
      {/* 侧边栏 - 移动端固定抽屉 */}
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
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); document.getElementById('admin-sidebar')?.classList.add('-translate-x-full'); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
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
              <p className="text-sm font-medium text-gray-800 truncate">{getCurrentUser()}</p>
              <p className="text-xs text-gray-400">管理员</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/mailbox" className="flex-1 text-xs py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-center transition">
              返回邮箱
            </Link>
            <button onClick={handleLogout} className="flex-1 text-xs py-2 border border-red-200 rounded-xl text-red-600 hover:bg-red-50 transition">
              退出
            </button>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        {/* 移动端顶栏 */}
        <div className="flex items-center justify-between mb-4 md:hidden">
          <button onClick={() => document.getElementById('admin-sidebar')?.classList.remove('-translate-x-full')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold text-gray-800 dark:text-gray-100">管理后台</span>
          <ThemeToggle />
        </div>

        {/* 桌面端主题切换 */}
        <div className="hidden md:flex justify-end mb-4">
          <ThemeToggle />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* 概览页 */}
            {activeTab === 'dashboard' && (
              <div className="animate-fade-in">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 md:mb-6">系统概览</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-6 md:mb-8">
                  {statCards.map((card, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 card-hover">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[card.color]}`}>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                          </svg>
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{card.value}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">最近用户</h2>
                  {users.length === 0 ? (
                    <p className="text-gray-400 dark:text-gray-500 text-sm py-8 text-center">暂无用户数据</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-gray-500 dark:text-gray-400">
                            <th className="pb-3 font-medium">邮箱地址</th>
                            <th className="pb-3 font-medium">角色</th>
                            <th className="pb-3 font-medium">状态</th>
                            <th className="pb-3 font-medium">注册时间</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                          {users.slice(0, 5).map((user) => (
                            <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className="py-3 text-gray-800 dark:text-gray-100 font-medium">{user.email}</td>
                              <td className="py-3">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                  user.type === 0 ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                                }`}>
                                  {user.type === 0 ? '管理员' : '普通用户'}
                                </span>
                              </td>
                              <td className="py-3">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                  user.status === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {user.status === 0 ? '正常' : '已禁用'}
                                </span>
                              </td>
                              <td className="py-3 text-gray-500">{user.createTime ? user.createTime.split(' ')[0] : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 用户管理页 */}
            {activeTab === 'users' && (
              <div className="animate-fade-in">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">用户管理</h1>

                {/* 创建用户 */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">添加用户</h2>
                  {message && (
                    <div className={`mb-4 p-3 rounded-xl text-sm ${message.includes('成功') ? 'bg-green-50 border border-green-200 text-green-600' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                      {message}
                    </div>
                  )}
                  <form onSubmit={handleCreateUser} className="flex gap-4 items-end flex-wrap">
                    <div className="flex-1 min-w-48">
                      <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
                      <div className="flex items-center border border-gray-200 rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-blue-500">
                        <input
                          type="text"
                          value={newUser.email}
                          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                          className="flex-1 outline-none"
                          placeholder="输入用户名"
                        />
                        <span className="text-gray-400 text-sm">@{settings.mailDomain}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-48">
                      <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
                      <input
                        type="text"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="至少6位"
                      />
                    </div>
                    <button type="submit" className="px-6 py-2.5 btn-gradient text-white rounded-xl font-medium shadow-md">
                      添加用户
                    </button>
                  </form>
                </div>

                {/* 用户列表 */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800">用户列表（共 {users.length} 人）</h2>
                  </div>
                  {users.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                      <p>暂无用户</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr className="text-left text-gray-500">
                            <th className="px-6 py-3 font-medium">邮箱地址</th>
                            <th className="px-6 py-3 font-medium">角色</th>
                            <th className="px-6 py-3 font-medium">状态</th>
                            <th className="px-6 py-3 font-medium">发件数</th>
                            <th className="px-6 py-3 font-medium">注册时间</th>
                            <th className="px-6 py-3 font-medium text-right">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {users.map((user) => (
                            <tr key={user.userId} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                    {user.email?.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-medium text-gray-800">{user.email}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                  user.type === 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {user.type === 0 ? '管理员' : '普通用户'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                  user.status === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {user.status === 0 ? '正常' : '已禁用'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-gray-500">{user.sendCount || 0}</td>
                              <td className="px-6 py-4 text-gray-500">{user.createTime ? user.createTime.split(' ')[0] : '-'}</td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleToggleStatus(user)}
                                    className={`px-3 py-1.5 text-xs border rounded-xl transition ${
                                      user.status === 0
                                        ? 'border-yellow-200 text-yellow-600 hover:bg-yellow-50'
                                        : 'border-green-200 text-green-600 hover:bg-green-50'
                                    }`}
                                  >
                                    {user.status === 0 ? '禁用' : '启用'}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(user.userId)}
                                    className="px-3 py-1.5 text-xs border border-red-200 rounded-xl text-red-600 hover:bg-red-50 transition"
                                  >
                                    删除
                                  </button>
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

            {/* 系统设置页 */}
            {activeTab === 'settings' && (
              <div className="animate-fade-in">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-gray-800">系统设置</h1>
                  <div className="flex gap-3">
                    <button onClick={handleResetSettings} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition">
                      重置默认
                    </button>
                    <button onClick={handleSaveSettings} className="px-6 py-2 btn-gradient text-white rounded-xl font-medium shadow-md flex items-center gap-2">
                      {settingsSaved ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          已保存
                        </>
                      ) : '保存设置'}
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* 基本设置 */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      基本设置
                    </h2>
                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">站点名称</label>
                        <input
                          type="text"
                          value={settings.siteName}
                          onChange={(e) => setSettingsState({ ...settings, siteName: e.target.value })}
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                          placeholder="输入站点名称"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">API 地址</label>
                        <input
                          type="text"
                          value={settings.apiBase}
                          onChange={(e) => setSettingsState({ ...settings, apiBase: e.target.value })}
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                          placeholder="https://api.example.com"
                        />
                        <p className="text-xs text-gray-400 mt-1">CloudMail 后端 API 地址，不要加末尾斜杠</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">默认邮箱域名</label>
                        <select
                          value={settings.mailDomain}
                          onChange={(e) => setSettingsState({ ...settings, mailDomain: e.target.value })}
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                        >
                          {settings.mailDomains.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 域名管理 */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      域名管理
                    </h2>
                    <div className="flex gap-3 mb-4">
                      <input
                        type="text"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        placeholder="输入新域名，例如 example.com"
                      />
                      <button onClick={handleAddDomain} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition">
                        添加
                      </button>
                    </div>
                    <div className="space-y-2">
                      {settings.mailDomains.map((domain) => (
                        <div key={domain} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <span className="text-sm font-medium text-gray-700">{domain}</span>
                            {domain === settings.mailDomain && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">默认</span>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveDomain(domain)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="删除域名"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cloudflare Turnstile 人机验证 */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Cloudflare Turnstile 人机验证
                    </h2>
                    <div className="space-y-5">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-gray-800">启用人机验证</p>
                          <p className="text-xs text-gray-500 mt-0.5">注册时需要完成 Cloudflare Turnstile 验证，防止恶意注册</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.turnstileEnabled}
                            onChange={(e) => setSettingsState({ ...settings, turnstileEnabled: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Turnstile Site Key</label>
                        <input
                          type="text"
                          value={settings.turnstileSiteKey}
                          onChange={(e) => setSettingsState({ ...settings, turnstileSiteKey: e.target.value })}
                          disabled={!settings.turnstileEnabled}
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 disabled:text-gray-400"
                          placeholder="0x0000000000000000000000000000000000000000"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          在 <a href="https://dash.cloudflare.com/?to=/:account/turnstile" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Cloudflare Dashboard</a> 创建站点获取，域名填你的 Pages 域名
                        </p>
                      </div>
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                        <p className="text-xs text-yellow-700 flex items-start gap-2">
                          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span>注意：开启验证后，还需要在 Pages 环境变量中添加 <code className="bg-yellow-100 px-1 rounded">TURNSTILE_SECRET_KEY</code>（密钥），服务端才能验证通过。保存设置后刷新页面生效。</span>
                        </p>
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
