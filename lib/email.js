// 邮件相关工具函数
import { authFetch } from './auth';
import { getAttachmentUrl, makeEndpoints } from './config';
import { getSettings } from './settings';
import { sanitizeHtml, htmlToText } from './sanitize';

// 格式化文件大小
export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

// 格式化日期显示
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr.replace(/-/g, '/'));
  if (isNaN(date.getTime())) return dateStr;
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toTimeString().slice(0, 5);
  if (isToday) return time;
  if (isYesterday) return '昨天';
  const sameYear = date.getFullYear() === now.getFullYear();
  const md = `${date.getMonth() + 1}月${date.getDate()}日`;
  return sameYear ? md : `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

// ============ 验证码提取 ============
// 从邮件纯文本/HTML 中提取验证码
export function extractVerifyCode(email) {
  if (!email) return null;
  // 用 DOMParser 惰性解析取纯文本：element.innerHTML 会真的去加载邮件里的图片/触发事件处理器
  let text = email.text || '';
  if (!text && email.content) text = htmlToText(email.content);
  if (!text) return null;
  text = text.replace(/&nbsp;/g, ' ');

  // 关键修复：所有规则都要求数字后面不能再紧跟字母/数字，
  // 否则长数字串（订单号、卡号、时间戳）的后 6 位会被当成验证码展示，
  // 而该 UI 带「一键复制」，误报会直接诱导用户复制错误内容。
  const BOUNDARY = '(?:[^0-9A-Za-z]|$)';
  const KEYWORD = '验证码|校验码|验证代码|动态码|code|verification code|verify code|security code|OTP|PIN';

  const strong = text.match(new RegExp('(?:' + KEYWORD + ')[^0-9A-Za-z]{0,12}([0-9]{4,8})' + BOUNDARY, 'i'));
  if (strong) return strong[1];

  const reverse = text.match(new RegExp('([0-9]{4,8})[^0-9A-Za-z]{0,12}(?:验证码|校验码|动态码|code|verification)', 'i'));
  if (reverse) return reverse[1];

  const mixed = text.match(new RegExp('(?:验证码|校验码|code)[^0-9A-Za-z]{0,10}([0-9A-Za-z]{4,8})' + BOUNDARY, 'i'));
  if (mixed && /[0-9]/.test(mixed[1]) && /[A-Za-z]/.test(mixed[1])) return mixed[1];

  // 兜底只认独立成段的 6 位数字：4~5 位独立数字误报代价太大
  const standalone = text.match(new RegExp('(?:^|[^0-9A-Za-z])([0-9]{6})' + BOUNDARY, 'm'));
  return standalone ? standalone[1] : null;
}


// ============ 邮件操作 ============
// 标记已读（emailIds 为数组）
export async function markEmailsRead(emailIds) {
  if (!emailIds || emailIds.length === 0) return;
  const { apiBase } = getSettings();
  const ep = makeEndpoints(apiBase);
  await authFetch(ep.EMAIL_READ, {
    method: 'PUT',
    body: JSON.stringify({ emailIds })
  });
}

// 星标 / 取消星标
export async function toggleStar(email, isStar) {
  const { apiBase } = getSettings();
  const ep = makeEndpoints(apiBase);
  const url = isStar ? ep.STAR_ADD : `${ep.STAR_CANCEL}?emailId=${email.emailId}`;
  await authFetch(url, {
    method: isStar ? 'POST' : 'DELETE',
    ...(isStar ? { body: JSON.stringify({ emailId: email.emailId }) } : {})
  });
}

// 删除邮件（emailIds 为数组）
export async function deleteEmails(emailIds) {
  if (!emailIds || emailIds.length === 0) return false;
  const { apiBase } = getSettings();
  const ep = makeEndpoints(apiBase);
  const res = await authFetch(`${ep.EMAIL_DELETE}?emailIds=${emailIds.join(',')}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  return data.code === 200;
}

// ============ 邮件正文 → 沙箱 iframe ============
// 邮件正文是最高危的输入，因此不再注入宿主页面，而是渲染进
// <iframe sandbox="allow-popups allow-popups-to-escape-sandbox">：
// 不开 allow-scripts / allow-same-origin ⇒ 脚本与内联事件一律不执行，
// 且文档为隔离源，读不到宿主页面的 localStorage token / cookie / DOM。
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

// 消毒前先把相对地址绝对化（srcdoc 没有可用 base），协议相对地址 //host 原样交给消毒器丢弃
function absolutizeUrls(html, base) {
  const origin = base.replace(/\/+$/, '');
  return html.replace(/(src|href)=(["'])([^"']+)\2/gi, (match, attr, quote, value) => {
    const raw = value.trim();
    if (/^(https?:|data:|mailto:|tel:)/i.test(raw)) return match;
    if (raw.startsWith('//')) return match;
    try {
      return attr + '=' + quote + new URL(raw, origin + '/').href + quote;
    } catch {
      return match;
    }
  });
}

export function buildEmailDoc({ html, text, apiBase, allowRemoteImages = false, dark = false } = {}) {
  const base = (apiBase || '').replace(/\/+$/, '');
  let origin = '';
  try {
    origin = new URL(base).origin;
  } catch {
    origin = '';
  }

  let source = typeof html === 'string' ? html : '';
  if (!source.trim()) {
    source = text ? '<pre class="plain">' + escapeHtml(text) + '</pre>' : '';
  }
  // 先做占位符替换与绝对化，再消毒：消毒必须是最后一步
  source = source.replace(/\{\{domain\}\}/g, base);
  source = absolutizeUrls(source, base || origin);

  const body = sanitizeHtml(source, {
    allowRemote: allowRemoteImages,
    allowOrigins: origin ? [origin] : []
  });
  const imgSrc = allowRemoteImages ? "https: data:" : (origin ? origin + " data:" : "data:");

  return [
    '<!DOCTYPE html>',
    '<html class="',
    dark ? 'dark' : '',
    '" lang="zh-CN"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src ',
    imgSrc,
    '; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'">',
    '<style>',
    'html{color-scheme:light}',
    'html.dark{color-scheme:dark}',
    'body{margin:0;padding:14px 16px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"PingFang SC","Microsoft YaHei",sans-serif;font-size:15px;line-height:1.8;color:#374151;background:#fff;word-break:break-word;overflow-wrap:anywhere}',
    'a{color:#4f46e5;text-decoration:underline}',
    'img{max-width:100%;height:auto}',
    'pre.plain{margin:0;white-space:pre-wrap;font-family:inherit}',
    'html.dark body{background:#111827;color:#e5e7eb}',
    'html.dark a{color:#93c5fd}',
    'html.dark body,html.dark div,html.dark td,html.dark p,html.dark span{background-color:transparent !important}',
    '</style></head><body>',
    body,
    '</body></html>'
  ].join('');
}

// 是否含远程图片/外链资源：用于显示「显示图片」按钮（在原始 JSON 字符串上做判断，不解析 HTML）
export function hasRemoteImages(html, text) {
  const source = [html, text].filter((v) => typeof v === 'string').join(' ');
  if (!source) return false;
  return /(src|background)\s*=\s*["']?\s*(https?:)?\/\/|url\(\s*["']?\s*(https?:)?\/\//i.test(source);
}

// 获取附件下载地址
export function getAttUrl(att, apiBase) {
  return getAttachmentUrl(att.key || att.url || att.path, apiBase);
}
