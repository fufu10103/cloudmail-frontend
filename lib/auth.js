import { API_ENDPOINTS } from './config';

// 获取存储的 token
export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cloudmail_token');
}

// 获取当前用户邮箱
export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cloudmail_email');
}

// 获取当前用户信息
export function getUserInfo() {
  if (typeof window === 'undefined') return null;
  const info = localStorage.getItem('cloudmail_userinfo');
  return info ? JSON.parse(info) : null;
}

// 获取当前账号 ID
export function getAccountId() {
  const info = getUserInfo();
  return info?.account?.accountId || info?.accountId || null;
}

// 检查是否已登录
export function isLoggedIn() {
  return !!getToken();
}

// 检查是否是管理员
export function isAdmin() {
  const info = getUserInfo();
  if (!info) return false;
  // 多种管理员判断方式，满足任一即可
  return (
    info?.type === 0 ||
    info?.userType === 0 ||
    info?.isAdmin === true ||
    info?.is_admin === 1 ||
    info?.role?.type === 0 ||
    info?.role?.id === 1 ||
    info?.role?.name?.includes('管理员') ||
    info?.permKeys?.includes('*') ||
    info?.permissions?.includes('*')
  );
}

// 登录
export async function login(email, password) {
  try {
    const res = await fetch(API_ENDPOINTS.LOGIN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (data.code === 200 && data.data?.token) {
      localStorage.setItem('cloudmail_token', data.data.token);
      localStorage.setItem('cloudmail_email', email);

      // 登录成功后获取用户信息
      try {
        const userInfo = await fetchLoginUserInfo(data.data.token);
        if (userInfo) {
          localStorage.setItem('cloudmail_userinfo', JSON.stringify(userInfo));
        }
      } catch (e) {
        console.warn('获取用户信息失败:', e);
      }

      return { success: true };
    }
    return { success: false, message: data.message || '登录失败' };
  } catch (err) {
    return { success: false, message: '网络错误，请重试' };
  }
}

// 获取当前登录用户信息
async function fetchLoginUserInfo(token) {
  const res = await fetch(API_ENDPOINTS.LOGIN_USER_INFO, {
    headers: { 'Authorization': token }
  });
  const data = await res.json();
  if (data.code === 200) {
    return data.data;
  }
  return null;
}

// 刷新用户信息
export async function refreshUserInfo() {
  const token = getToken();
  if (!token) return null;
  const info = await fetchLoginUserInfo(token);
  if (info) {
    localStorage.setItem('cloudmail_userinfo', JSON.stringify(info));
  }
  return info;
}

// 登出
export function logout() {
  localStorage.removeItem('cloudmail_token');
  localStorage.removeItem('cloudmail_email');
  localStorage.removeItem('cloudmail_userinfo');
}

// 带认证的 fetch（token 直接放 Authorization 头，不加 Bearer 前缀）
export async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  if (token) {
    headers['Authorization'] = token;
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    logout();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('未登录');
  }

  return res;
}

// 统一处理 API 响应
export async function apiRequest(url, options = {}) {
  const res = await authFetch(url, options);
  const data = await res.json();
  if (data.code === 200) {
    return { success: true, data: data.data };
  }
  return { success: false, message: data.message || '请求失败' };
}
