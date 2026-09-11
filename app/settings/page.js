'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { makeEndpoints } from '@/lib/config';
import { isLoggedIn, getCurrentUser, logout, authFetch, getUserInfo, refreshUserInfo } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import ThemeToggle from '@/components/ThemeToggle';

export default function SettingsPage() {
  const router = useRouter();
  const settings = getSettings();
  const ep = makeEndpoints(settings.apiBase);

  const [userInfo, setUserInfo] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [toast, setToast] = useState('');

  // 修改密码
  const [pwd, setPwd] = useState({ p1: '', p2: '' });
  const [pwdSaving, setPwdSaving] = useState(false);

  // 添加邮箱
  const [newEmailPrefix, setNewEmailPrefix] = useState('');
  const [newEmailDomain, setNewEmailDomain] = useState(settings.mailDomains[0] || '');

  // 签名
  const [signature, setSignature] = useState('');

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return; }
    setUserInfo(getUserInfo());
    setSignature(localStorage.getItem('cloudmail_signature') || '');
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const loadAccounts = async () => {
    try {
      const res = await authFetch(`${ep.ACCOUNT_LIST}?size=30`);
      const data = await res.json();
      if (data.code === 200 && Array.isArray(data.data)) setAccounts(data.data);
    } catch (e) { /* 忽略 */ }
  };

  // ============ 修改密码 ============
  const handleChangePwd = async (e) => {
    e.preventDefault();
    if (pwd.p1.length < 6) { showToast('新密码至少 6 位'); return; }
    if (pwd.p1 !== pwd.p2) { showToast('两次输入的密码不一致'); return; }
    setPwdSaving(true);
    try {
      const res = await authFetch(ep.RESET_PASSWORD, {
        method: 'PUT',
        body: JSON.stringify({ password: pwd.p1 })
      });
      const data = await res.json();
      if (data.code === 200) {
        showToast('密码修改成功，下次登录请使用新密码');
        setPwd({ p1: '', p2: '' });
      } else {
        showToast(data.message || '修改失败');
      }
    } catch (e) { showToast('网络错误'); }
    finally { setPwdSaving(false); }
  };

  // ============ 多邮箱管理 ============
  const handleAddAccount = async () => {
    if (!newEmailPrefix.trim()) { showToast('请输入邮箱前缀'); return; }
    const email = `${newEmailPrefix.trim()}@${newEmailDomain}`;
    try {
      const res = await authFetch(ep.ACCOUNT_ADD, {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.code === 200) {
        showToast('邮箱添加成功');
        setNewEmailPrefix('');
        loadAccounts();
      } else {
        showToast(data.message || '添加失败（可能后端未开启多号模式）');
      }
    } catch (e) { showToast('网络错误'); }
  };

  const handleDeleteAccount = async (accountId, email) => {
    if (!confirm(`确定删除邮箱 ${email} 吗？该邮箱下的邮件会一并移除。`)) return;
    try {
      const res = await authFetch(`${ep.ACCOUNT_DELETE}?accountId=${accountId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.code === 200) { showToast('已删除'); loadAccounts(); }
      else showToast(data.message || '删除失败');
    } catch (e) { showToast('网络错误'); }
  };

  const handleRenameAccount = async (acc) => {
    const name = prompt('设置邮箱备注名称：', acc.name || '');
    if (name === null) return;
    try {
      await authFetch(ep.ACCOUNT_SET_NAME, {
        method: 'PUT',
        body: JSON.stringify({ accountId: acc.accountId, name: name.slice(0, 30) })
      });
      loadAccounts();
    } catch (e) { showToast('操作失败'); }
  };

  const handleToggleReceive = async (acc) => {
    try {
      await authFetch(ep.ACCOUNT_SET_ALL_RECEIVE, {
        method: 'PUT',
        body: JSON.stringify({ accountId: acc.accountId })
      });
      loadAccounts();
    } catch (e) { showToast('操作失败'); }
  };

  // ============ 签名 ============
  const saveSignature = () => {
    localStorage.setItem('cloudmail_signature', signature);
    showToast('签名已保存');
  };

  // ============ 注销账号 ============
  const handleDeleteSelf = async () => {
    if (!confirm('警告：注销后账号及其所有邮件将被永久删除，无法恢复！确定继续吗？')) return;
    if (!confirm('请再次确认：真的要永久注销当前账号吗？')) return;
    try {
      await authFetch(ep.DELETE_ACCOUNT, { method: 'DELETE' });
      logout();
      router.push('/login');
    } catch (e) { showToast('注销失败'); }
  };

  const handleLogout = () => { logout(); router.push('/login'); };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* 顶栏 */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 md:px-6 py-3.5 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-2 md:gap-4">
          <Link href="/mailbox" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </Link>
          <h1 className="text-base md:text-lg font-semibold text-gray-800 dark:text-gray-100">个人设置</h1>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button onClick={handleLogout} className="text-xs px-3 py-2 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30">退出登录</button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-5 md:space-y-6">
        {/* 个人信息 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">账号信息</h2>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-semibold shadow-md flex-shrink-0">
              {getCurrentUser()?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold text-gray-800 dark:text-gray-100 break-all">{getCurrentUser()}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {userInfo?.role?.name || '普通用户'} · 已发送 {userInfo?.sendCount || 0} 封
              </p>
            </div>
          </div>
        </div>

        {/* 修改密码 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">修改密码</h2>
          <form onSubmit={handleChangePwd} className="space-y-3">
            <input
              type="password"
              value={pwd.p1}
              onChange={(e) => setPwd({ ...pwd, p1: e.target.value })}
              placeholder="新密码（至少 6 位）"
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
            />
            <input
              type="password"
              value={pwd.p2}
              onChange={(e) => setPwd({ ...pwd, p2: e.target.value })}
              placeholder="再次输入新密码"
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
            />
            <button type="submit" disabled={pwdSaving} className="px-5 py-2.5 btn-gradient text-white text-sm font-medium rounded-xl disabled:opacity-50">
              {pwdSaving ? '提交中...' : '确认修改'}
            </button>
          </form>
        </div>

        {/* 多邮箱管理 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">我的邮箱</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">一个账号可绑定多个邮箱地址（需后端开启多号模式）</p>
          <div className="space-y-2 mb-4">
            {accounts.map(acc => (
              <div key={acc.accountId} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{acc.email}</p>
                  <p className="text-xs text-gray-400">{acc.name ? `备注：${acc.name} · ` : ''}{acc.allReceive ? '合并收件' : '独立收件'}</p>
                </div>
                <button onClick={() => handleRenameAccount(acc)} className="text-xs px-2.5 py-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">备注</button>
                <button onClick={() => handleToggleReceive(acc)} className="text-xs px-2.5 py-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">{acc.allReceive ? '独立' : '合并'}</button>
                <button onClick={() => handleDeleteAccount(acc.accountId, acc.email)} className="text-xs px-2.5 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">删除</button>
              </div>
            ))}
            {accounts.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">加载中或暂无多邮箱</p>}
          </div>
          <div className="flex gap-2 flex-col sm:flex-row">
            <div className="flex flex-1 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
              <input
                type="text"
                value={newEmailPrefix}
                onChange={(e) => setNewEmailPrefix(e.target.value)}
                placeholder="新邮箱前缀"
                className="flex-1 px-4 py-2.5 outline-none bg-transparent text-gray-800 dark:text-gray-100 text-sm min-w-0"
              />
              <span className="self-center text-gray-400 text-sm">@</span>
              <select value={newEmailDomain} onChange={(e) => setNewEmailDomain(e.target.value)} className="px-2 py-2.5 outline-none bg-transparent text-gray-700 dark:text-gray-200 text-sm border-l border-gray-200 dark:border-gray-700">
                {settings.mailDomains.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <button onClick={handleAddAccount} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">添加邮箱</button>
          </div>
        </div>

        {/* 发件签名 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">发件签名</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">保存在本地，写邮件时可手动附加到正文末尾</p>
          <textarea
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            rows={3}
            placeholder="例如：——&#10;张三 | 产品经理&#10;电话 138xxxx"
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm resize-none"
          />
          <button onClick={saveSignature} className="mt-3 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700">保存签名</button>
        </div>

        {/* 危险操作 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 md:p-6 shadow-sm border border-red-100 dark:border-red-900/50">
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">危险操作</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">注销账号会永久删除你的账号、全部邮箱与邮件，且无法恢复。</p>
          <button onClick={handleDeleteSelf} className="px-5 py-2.5 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30">永久注销账号</button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-xl shadow-2xl animate-fade-in">{toast}</div>
      )}
    </div>
  );
}
