// 邮件相关工具函数
import { authFetch } from './auth';
import { getAttachmentUrl, makeEndpoints } from './config';
import { getSettings } from './settings';
import { sanitizeHtml } from './sanitize';

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
  // 优先用纯文本，再退回 HTML 去标签
  let text = email.text || '';
  if (!text && email.content) {
    text = email.content.replace(/<[^>]+>/g, ' ');
  }
  if (!text) return null;
  // 解码常见 HTML 实体
  text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

  // 关键词 + 验证码组合，按可信度排序
  const keywordPatterns = [
    /(?:验证码|校验码|验证代码|动态码|验证码为|验证码是|code|verification code|verify code|security code|OTP|PIN)[^\dA-Za-z]{0,12}([0-9]{4,8})/i,
    /([0-9]{4,8})[^\dA-Za-z]{0,12}(?:验证码|校验码|动态码|code|verification)/i
  ];
  for (const re of keywordPatterns) {
    const m = text.match(re);
    if (m && m[1]) return m[1];
  }

  // 字母数字混合验证码（如 A1B2C3），需要关键词
  const mixed = text.match(/(?:验证码|校验码|code)[^\dA-Za-z]{0,10}([0-9A-Za-z]{4,8})/i);
  if (mixed && /\d/.test(mixed[1]) && /[A-Za-z]/.test(mixed[1])) {
    return mixed[1];
  }

  // 兜底：独立成行/被强调的 4-8 位数字（避免误匹配长数字）
  const standalone = text.match(/(?:^|[\s:：#\n>])([0-9]{4,6})(?=[\s<\n]|$)/m);
  if (standalone) return standalone[1];

  return null;
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

// 处理邮件正文：消毒 + 补全附件/图片地址
export function renderEmailContent(content, apiBase) {
  if (!content) return '';
  let html = sanitizeHtml(content);
  // 后端用 {{domain}} 作占位符
  html = html.replace(/\{\{domain\}\}/g, (apiBase || '').replace(/\/+$/, ''));
  // 相对路径 attachments/ 补全
  const base = (apiBase || '').replace(/\/+$/, '');
  html = html.replace(/(src|href)=["']attachments\//g, `$1="${base}/attachments/`);
  return html;
}

// 获取附件下载地址
export function getAttUrl(att, apiBase) {
  return getAttachmentUrl(att.key || att.url || att.path, apiBase);
}
