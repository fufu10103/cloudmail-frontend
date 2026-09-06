// 全局配置 - 部署前请修改这些值
export const CONFIG = {
  // 你的邮箱域名
  MAIL_DOMAIN: 'example.com',

  // CloudMail 后端 API 地址（不要加末尾斜杠）
  API_BASE: 'https://your-cloudmail-domain.com',

  // 站点名称
  SITE_NAME: 'CloudMail'
};

// API 端点
export const API_ENDPOINTS = {
  REGISTER: `${CONFIG.API_BASE}/api/auth/register`,
  LOGIN: `${CONFIG.API_BASE}/api/auth/login`,
  LOGOUT: `${CONFIG.API_BASE}/api/auth/logout`,
  USER_INFO: `${CONFIG.API_BASE}/api/user/info`,
  MAIL_LIST: `${CONFIG.API_BASE}/api/mail/list`,
  MAIL_DETAIL: `${CONFIG.API_BASE}/api/mail/detail`,
  MAIL_SEND: `${CONFIG.API_BASE}/api/mail/send`,
  MAIL_DELETE: `${CONFIG.API_BASE}/api/mail/delete`
};
