'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CONFIG, API_ENDPOINTS } from '@/lib/config';
import { isLoggedIn, getCurrentUser, logout, authFetch, isAdmin } from '@/lib/auth';

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({ email: '', password: '' });
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
      const email = newUser.email.includes('@') ? newUser.email : `${newUser.email}@${CONFIG.MAIL_DOMAIN}`;
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

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const tabs = [
    { id: 'dashboard', name: '概览', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { id: 'users', name: '用户管理', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' }
  ];

  const statCards = [
    { label: '总用户数', value: stats.total || users.length || 0, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: 'blue' },
    { label: '正常用户', value: users.filter(u => u.status === 0 && u.isDel === 0).length, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'green' },
    { label: '已禁用', value: users.filter(u => u.status === 1).length, icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636', color: 'red' },
    { label: '管理员', value: users.filter(u => u.type === 0).length, icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: 'purple' }
  ];

  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600'
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
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">用户列表</h2>
                  {users.length === 0 ? (
                    <p className="text-gray-400 text-sm">暂无用户数据</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-left text-gray-500">
                            <th className="pb-3 font-medium">邮箱地址</th>
                            <th className="pb-3 font-medium">角色</th>
                            <th className="pb-3 font-medium">状态</th>
                            <th className="pb-3 font-medium">注册时间</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {users.slice(0, 5).map((user) => (
                            <tr key={user.userId}>
                              <td className="py-3 text-gray-800">{user.email}</td>
                              <td className="py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  user.type === 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {user.type === 0 ? '管理员' : '普通用户'}
                                </span>
                              </td>
                              <td className="py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
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
              <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-6">用户管理</h1>

                {/* 创建用户 */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">添加用户</h2>
                  {message && (
                    <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes('成功') ? 'bg-green-50 border border-green-200 text-green-600' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                      {message}
                    </div>
                  )}
                  <form onSubmit={handleCreateUser} className="flex gap-4 items-end flex-wrap">
                    <div className="flex-1 min-w-48">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">邮箱</label>
                      <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-primary-500">
                        <input
                          type="text"
                          value={newUser.email}
                          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                          className="flex-1 outline-none"
                          placeholder="输入用户名"
                        />
                        <span className="text-gray-400 text-sm">@{CONFIG.MAIL_DOMAIN}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-48">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
                      <input
                        type="text"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                        placeholder="至少6位"
                      />
                    </div>
                    <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition">
                      添加用户
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
                        <tbody className="divide-y divide-gray-100">
                          {users.map((user) => (
                            <tr key={user.userId} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                    {user.email?.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-medium text-gray-800">{user.email}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  user.type === 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {user.type === 0 ? '管理员' : '普通用户'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
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
                                    className={`px-3 py-1 text-xs border rounded transition ${
                                      user.status === 0
                                        ? 'border-yellow-300 text-yellow-600 hover:bg-yellow-50'
                                        : 'border-green-300 text-green-600 hover:bg-green-50'
                                    }`}
                                  >
                                    {user.status === 0 ? '禁用' : '启用'}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(user.userId)}
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
          </>
        )}
      </main>
    </div>
  );
}
