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

// 检查是否已登录
export function isLoggedIn() {
  return !!getToken();
}

// 登录
export async function login(email, password) {
  const res = await fetch(API_ENDPOINTS.LOGIN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (res.ok && data.token) {
    localStorage.setItem('cloudmail_token', data.token);
    localStorage.setItem('cloudmail_email', email);
    return { success: true };
  }
  return { success: false, message: data.message || '登录失败' };
}

// 注册
export async function register(email, password) {
  const res = await fetch(API_ENDPOINTS.REGISTER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (res.ok) {
    return { success: true };
  }
  return { success: false, message: data.message || '注册失败' };
}

// 登出
export function logout() {
  localStorage.removeItem('cloudmail_token');
  localStorage.removeItem('cloudmail_email');
}

// 带认证的 fetch
export async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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
