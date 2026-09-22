import { API_ENDPOINTS, CONFIG } from './config';
// 不再从 localStorage 的 cloudmail_settings 读取管理员身份（该文件用户可随意改写）

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

// 管理员判定：只接受「后端返回的用户信息」，并且只认后端下发的邮箱地址。
// 绝不读取 localStorage 里可被用户改写的 cloudmail_settings.adminEmail，
// 也不再把 localStorage 里的 cloudmail_email 当可信输入。
// 注意：前端判定只决定要不要显示管理界面，真正的权限边界必须由后端在
// /api/user/*、/api/allEmail/*、/api/analysis 等接口上逐个校验。
function hasAdminRole(info) {
  if (!info) return false;
  return (
    info.type === 0 ||
    info.userType === 0 ||
    info.isAdmin === true ||
    info.is_admin === 1 ||
    info.role?.type === 0 ||
    info.role?.id === 1 ||
    info.permKeys?.includes('*') ||
    info.permissions?.includes('*')
  );
}

function looksAdmin(backendEmail, info) {
  if (
    backendEmail &&
    Array.isArray(CONFIG.ADMIN_EMAILS) &&
    CONFIG.ADMIN_EMAILS.includes(String(backendEmail).toLowerCase())
  ) {
    return true;
  }
  return hasAdminRole(info);
}

// 粗略判断（读本地缓存），只用于「要不要显示管理入口」，不能作为权限依据
export function isAdmin() {
  return looksAdmin(null, getUserInfo());
}

// 权威判断：进入管理页前向后端重新拉一次当前登录用户信息。
// 拉取失败一律按非管理员处理，避免用被篡改的本地缓存放行。
export async function verifyAdmin() {
  let info;
  try {
    info = await refreshUserInfo();
  } catch {
    return false;
  }
  if (!info) return false;
  const email = typeof info.email === 'string' && info.email ? info.email : null;
  return looksAdmin(email, info);
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
