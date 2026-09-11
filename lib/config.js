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
  TURNSTILE_SITE_KEY: '',

  // 管理员邮箱白名单（这些邮箱无论用户信息里的角色字段是什么，都认定为管理员）
  ADMIN_EMAILS: [
    'admin@mailfufu1.qzz.io',
    '111111@mailfufu1.qzz.io'
  ],

  // 自动刷新新邮件间隔（毫秒），设为 0 关闭
  REFRESH_INTERVAL: 60000
};

// 根据后端地址动态生成全部 API 端点（后台修改 API 地址后能实时生效）
export function makeEndpoints(apiBase) {
  const base = (apiBase || CONFIG.API_BASE).replace(/\/+$/, '');
  return {
    // 认证
    LOGIN: `${base}/api/login`,
    LOGOUT: `${base}/api/logout`,
    LOGIN_USER_INFO: `${base}/api/my/loginUserInfo`,
    RESET_PASSWORD: `${base}/api/my/resetPassword`,
    DELETE_ACCOUNT: `${base}/api/my/delete`,

    // 邮箱账号（多号模式）
    ACCOUNT_LIST: `${base}/api/account/list`,
    ACCOUNT_ADD: `${base}/api/account/add`,
    ACCOUNT_DELETE: `${base}/api/account/delete`,
    ACCOUNT_SET_NAME: `${base}/api/account/setName`,
    ACCOUNT_SET_ALL_RECEIVE: `${base}/api/account/setAllReceive`,
    ACCOUNT_SET_TOP: `${base}/api/account/setAsTop`,

    // 邮件
    EMAIL_LIST: `${base}/api/email/list`,
    EMAIL_LATEST: `${base}/api/email/latest`,
    EMAIL_SEND: `${base}/api/email/send`,
    EMAIL_DELETE: `${base}/api/email/delete`,
    EMAIL_READ: `${base}/api/email/read`,
    EMAIL_ATT_LIST: `${base}/api/email/attList`,

    // 星标
    STAR_ADD: `${base}/api/star/add`,
    STAR_CANCEL: `${base}/api/star/cancel`,
    STAR_LIST: `${base}/api/star/list`,

    // 附件下载（/attachments/ 不带 /api 前缀）
    ATTACHMENT_BASE: `${base}/attachments`,

    // 管理 - 用户
    ADMIN_USER_LIST: `${base}/api/user/list`,
    ADMIN_USER_ADD: `${base}/api/user/add`,
    ADMIN_USER_SET_STATUS: `${base}/api/user/setStatus`,
    ADMIN_USER_DELETE: `${base}/api/user/delete`,

    // 管理 - 邮件
    ADMIN_EMAIL_LIST: `${base}/api/allEmail/list`,
    ADMIN_EMAIL_DELETE: `${base}/api/allEmail/delete`,

    // 管理 - 统计分析
    ADMIN_ANALYSIS: `${base}/api/analysis`,

    // 管理 - 注册码
    ADMIN_REGKEY_LIST: `${base}/api/regKey/list`,
    ADMIN_REGKEY_ADD: `${base}/api/regKey/add`,
    ADMIN_REGKEY_DELETE: `${base}/api/regKey/delete`
  };
}

// 默认端点（向后兼容，使用 CONFIG.API_BASE）
export const API_ENDPOINTS = makeEndpoints(CONFIG.API_BASE);

// 拼接附件完整下载地址
export function getAttachmentUrl(key, apiBase) {
  if (!key) return '';
  if (key.startsWith('http')) {
    // 仅允许 http/https 外链
    return /^https?:\/\//i.test(key) ? key : '';
  }
  const base = (apiBase || CONFIG.API_BASE).replace(/\/+$/, '');
  // 防路径穿越：去掉协议相对头、目录回溯、反斜杠与控制字符，只保留安全字符
  let clean = String(key)
    .replace(/^attachments\//, '')
    .replace(/\\/g, '/')
    .replace(/\.\.\//g, '')
    .replace(/^\/+/, '')
    .replace(/[\s"'<>]/g, '');
  return `${base}/attachments/${clean}`;
}
