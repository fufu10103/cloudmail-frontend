'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CONFIG, API_ENDPOINTS } from '@/lib/config';
import { isLoggedIn, getCurrentUser, logout, authFetch } from '@/lib/auth';

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalMails: 0, storageUsed: 0 });
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({ username: '', password: '' });
  const [message, setMessage] = useState('');

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
      // 获取统计数据
      const statsRes = await authFetch(`${CONFIG.API_BASE}/api/admin/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats || statsData);
      }

      // 获取用户列表
      const usersRes = await authFetch(`${CONFIG.API_BASE}/api/admin/users`);
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || usersData.list || []);
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
    if (!newUser.username || !newUser.password) {
      setMessage('请填写用户名和密码');
      return;
    }
    try {
      const res = await authFetch(`${CONFIG.API_BASE}/api/admin/users`, {
        method: 'POST',
        body: JSON.stringify({
          email: `${newUser.username}@${CONFIG.MAIL_DOMAIN}`,
          password: newUser.password
        })
      });
      if (res.ok) {
        setMessage('用户创建成功');
        setNewUser({ username: '', password: '' });
        fetchData();
      } else {
        const data = await res.json();
        setMessage(data.message || '创建失败');
      }
    } catch (err) {
      setMessage('网络错误');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('确定要删除这个用户吗？此操作不可恢复。')) return;
    try {
      await authFetch(`${CONFIG.API_BASE}/api/admin/users/${userId}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error('删除用户失败:', err);
    }
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
    { label: '总用户数', value: stats.totalUsers || users.length || 0, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: 'blue' },
    { label: '邮件总数', value: stats.totalMails || 0, icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color: 'green' },
    { label: '存储使用', value: stats.storageUsed ? `${(stats.storageUsed / 1024 / 1024).toFixed(1)} MB` : '0 MB', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4', color: 'purple' },
    { label: '今日注册', value: stats.todayRegistrations || 0, icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', color: 'orange' }
  ];

  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600'
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* 侧边栏 */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <Link href="/mailbox" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-bold text-gray-800 text-lg">管理后台</span>
          </Link>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
              <p className="text-xs text-gray-500">管理员</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/mailbox" className="flex-1 text-xs py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 text-center transition">
              返回邮箱
            </Link>
            <button onClick={handleLogout} className="flex-1 text-xs py-1.5 border border-red-300 rounded text-red-600 hover:bg-red-50 transition">
              退出
            </button>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            {/* 概览页 */}
            {activeTab === 'dashboard' && (
              <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-6">系统概览</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {statCards.map((card, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[card.color]}`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                          </svg>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                      <p className="text-sm text-gray-500 mt-1">{card.label}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">最近注册用户</h2>
                  {users.length === 0 ? (
                    <p className="text-gray-400 text-sm">暂无用户数据</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-left text-gray-500">
                            <th className="pb-3 font-medium">邮箱地址</th>
                            <th className="pb-3 font-medium">状态</th>
                            <th className="pb-3 font-medium">注册时间</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {users.slice(0, 5).map((user, idx) => (
                            <tr key={user.id || idx}>
                              <td className="py-3 text-gray-800">{user.email || user.username}</td>
                              <td className="py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  user.active === false ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'
                                }`}>
                                  {user.active === false ? '已禁用' : '正常'}
                                </span>
                              </td>
                              <td className="py-3 text-gray-500">{user.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '-'}</td>
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
              <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-6">用户管理</h1>

                {/* 创建用户 */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">创建新用户</h2>
                  {message && (
                    <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes('成功') ? 'bg-green-50 border border-green-200 text-green-600' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                      {message}
                    </div>
                  )}
                  <form onSubmit={handleCreateUser} className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">用户名</label>
                      <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-primary-500">
                        <input
                          type="text"
                          value={newUser.username}
                          onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                          className="flex-1 outline-none"
                          placeholder="输入用户名"
                        />
                        <span className="text-gray-400 text-sm">@{CONFIG.MAIL_DOMAIN}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">初始密码</label>
                      <input
                        type="text"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                        placeholder="设置初始密码"
                      />
                    </div>
                    <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition">
                      创建用户
                    </button>
                  </form>
                </div>

                {/* 用户列表 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800">用户列表（共 {users.length} 人）</h2>
                  </div>
                  {users.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                      <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <p>暂无用户</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr className="text-left text-gray-500">
                            <th className="px-6 py-3 font-medium">邮箱地址</th>
                            <th className="px-6 py-3 font-medium">状态</th>
                            <th className="px-6 py-3 font-medium">存储空间</th>
                            <th className="px-6 py-3 font-medium">注册时间</th>
                            <th className="px-6 py-3 font-medium text-right">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {users.map((user, idx) => (
                            <tr key={user.id || idx} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                    {(user.email || user.username || '?').charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-medium text-gray-800">{user.email || user.username}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  user.active === false ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'
                                }`}>
                                  {user.active === false ? '已禁用' : '正常'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-gray-500">
                                {user.storage_used ? `${(user.storage_used / 1024 / 1024).toFixed(1)} MB` : '-'}
                              </td>
                              <td className="px-6 py-4 text-gray-500">
                                {user.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '-'}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button className="px-3 py-1 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-50 transition">
                                    编辑
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="px-3 py-1 text-xs border border-red-300 rounded text-red-600 hover:bg-red-50 transition"
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
              <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-6">系统设置</h1>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">基本设置</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                          <div>
                            <p className="font-medium text-gray-800">开放用户注册</p>
                            <p className="text-sm text-gray-500">允许新用户通过注册页面创建账号</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" defaultChecked className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                          </label>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                          <div>
                            <p className="font-medium text-gray-800">注册需要验证</p>
                            <p className="text-sm text-gray-500">开启人机验证防止恶意注册</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" defaultChecked className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                          </label>
                        </div>
                        <div className="flex items-center justify-between py-3">
                          <div>
                            <p className="font-medium text-gray-800">单用户存储限额</p>
                            <p className="text-sm text-gray-500">每个邮箱账号的最大存储空间</p>
                          </div>
                          <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                            <option>100 MB</option>
                            <option>500 MB</option>
                            <option selected>1 GB</option>
                            <option>5 GB</option>
                            <option>10 GB</option>
                            <option>不限制</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">邮件设置</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                          <div>
                            <p className="font-medium text-gray-800">单封邮件大小限制</p>
                            <p className="text-sm text-gray-500">包括附件在内的最大邮件体积</p>
                          </div>
                          <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                            <option>10 MB</option>
                            <option selected>25 MB</option>
                            <option>50 MB</option>
                            <option>100 MB</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between py-3">
                          <div>
                            <p className="font-medium text-gray-800">启用垃圾邮件过滤</p>
                            <p className="text-sm text-gray-500">自动识别并拦截垃圾邮件</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" defaultChecked className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <button className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition">
                        保存设置
                      </button>
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
