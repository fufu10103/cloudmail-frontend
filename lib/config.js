// 全局配置
export const CONFIG = {
  // 默认邮箱域名
  MAIL_DOMAIN: 'mailfufu1.qzz.io',

  // 支持的所有邮箱域名（注册时可选）
  MAIL_DOMAINS: [
    'mailfufu1.qzz.io',
    'mailfufu.dpdns.org',
    'gorebox.dpdns.org'
  ],

  // CloudMail 后端 API 地址（不要加末尾斜杠）
  API_BASE: 'https://www.mailfufu1.qzz.io',

  // 站点名称
  SITE_NAME: 'CloudMail',

  // Cloudflare Turnstile 人机验证 Site Key
  // 在 https://dash.cloudflare.com/?to=/:account/turnstile 创建站点获取
  // 留空则不启用验证
  TURNSTILE_SITE_KEY: '',

  // 管理员邮箱白名单（这些邮箱无论用户信息里的角色字段是什么，都认定为管理员）
  ADMIN_EMAILS: [
    'admin@mailfufu1.qzz.io',
    '111111@mailfufu1.qzz.io'
  ]
};

// API 端点（根据 SkyMail/CloudMail 接口文档）
export const API_ENDPOINTS = {
  // 认证
  LOGIN: `${CONFIG.API_BASE}/api/login`,
  LOGOUT: `${CONFIG.API_BASE}/api/logout`,
  LOGIN_USER_INFO: `${CONFIG.API_BASE}/api/my/loginUserInfo`,

  // 邮箱账号
  ACCOUNT_LIST: `${CONFIG.API_BASE}/api/account/list`,
  ACCOUNT_ADD: `${CONFIG.API_BASE}/api/account/add`,
  ACCOUNT_DELETE: `${CONFIG.API_BASE}/api/account/delete`,

  // 邮件
  EMAIL_LIST: `${CONFIG.API_BASE}/api/email/list`,
  EMAIL_SEND: `${CONFIG.API_BASE}/api/email/send`,
  EMAIL_DELETE: `${CONFIG.API_BASE}/api/email/delete`,

  // 管理 - 用户
  ADMIN_USER_LIST: `${CONFIG.API_BASE}/api/user/list`,
  ADMIN_USER_ADD: `${CONFIG.API_BASE}/api/user/add`,
  ADMIN_USER_SET_STATUS: `${CONFIG.API_BASE}/api/user/setStatus`,
  ADMIN_USER_DELETE: `${CONFIG.API_BASE}/api/user/delete`,

  // 管理 - 邮件
  ADMIN_EMAIL_LIST: `${CONFIG.API_BASE}/api/allEmail/list`,
  ADMIN_EMAIL_DELETE: `${CONFIG.API_BASE}/api/allEmail/delete`,

  // 管理 - 注册码
  ADMIN_REGKEY_LIST: `${CONFIG.API_BASE}/api/regKey/list`,
  ADMIN_REGKEY_ADD: `${CONFIG.API_BASE}/api/regKey/add`,
  ADMIN_REGKEY_DELETE: `${CONFIG.API_BASE}/api/regKey/delete`
};
