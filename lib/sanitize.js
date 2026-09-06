// 简单的 HTML 消毒，防止 XSS
// 使用白名单机制，只允许安全的标签和属性

// 允许的标签白名单
const ALLOWED_TAGS = new Set([
  'p', 'br', 'div', 'span', 'a', 'strong', 'b', 'em', 'i', 'u',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'img', 'font', 'center'
]);

// 允许的属性白名单（按标签）
const ALLOWED_ATTRS = {
  '*': ['style', 'class', 'align', 'dir'],
  'a': ['href', 'title', 'target', 'rel'],
  'img': ['src', 'alt', 'title', 'width', 'height', 'style'],
  'td': ['colspan', 'rowspan', 'width', 'height', 'align', 'valign', 'style'],
  'th': ['colspan', 'rowspan', 'width', 'height', 'align', 'valign', 'style'],
  'font': ['color', 'size', 'face'],
  'div': ['align'],
  'p': ['align']
};

// 允许的 URL 协议
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

// 检查 URL 是否安全
function isSafeUrl(url) {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  // 允许相对路径和锚点
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('?')) return true;
  // 检查协议
  try {
    const urlObj = new URL(trimmed, 'https://example.com');
    return ALLOWED_PROTOCOLS.has(urlObj.protocol);
  } catch {
    return false;
  }
}

// 消毒属性值
function sanitizeAttr(tagName, attrName, attrValue) {
  const allowed = ALLOWED_ATTRS[tagName] || ALLOWED_ATTRS['*'] || [];
  if (!allowed.includes(attrName.toLowerCase())) return null;

  // 特殊处理 href 和 src
  if (attrName.toLowerCase() === 'href' || attrName.toLowerCase() === 'src') {
    if (!isSafeUrl(attrValue)) return null;
    // 给链接加 rel="noopener noreferrer"
    if (attrName.toLowerCase() === 'href' && attrValue.startsWith('http')) {
      return attrValue;
    }
  }

  // 过滤 style 中的危险属性
  if (attrName.toLowerCase() === 'style') {
    return attrValue
      .replace(/expression\s*\(/gi, '')
      .replace(/javascript\s*:/gi, '')
      .replace(/vbscript\s*:/gi, '')
      .replace(/url\s*\(\s*["']?\s*javascript:/gi, '');
  }

  return attrValue;
}

// 主消毒函数
export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';

  // 先移除 script、style、iframe、object、embed、form、input 等危险标签及其内容
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    .replace(/<input\b[^>]*>/gi, '')
    .replace(/<textarea\b[^<]*(?:(?!<\/textarea>)<[^<]*)*<\/textarea>/gi, '')
    .replace(/<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi, '')
    .replace(/<select\b[^<]*(?:(?!<\/select>)<[^<]*)*<\/select>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
    .replace(/<base\b[^>]*>/gi, '');

  // 移除 on* 事件处理器
  cleaned = cleaned.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // 移除 javascript: 协议
  cleaned = cleaned.replace(/javascript\s*:/gi, '');
  cleaned = cleaned.replace(/vbscript\s*:/gi, '');
  cleaned = cleaned.replace(/data\s*:\s*text\/html/gi, '');

  // 使用 DOM 解析进一步过滤（浏览器环境）
  if (typeof document !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${cleaned}</div>`, 'text/html');
      const container = doc.body.firstChild;

      function cleanNode(node) {
        if (node.nodeType === 3) return; // 文本节点跳过
        if (node.nodeType !== 1) {
          node.remove();
          return;
        }

        const tagName = node.tagName.toLowerCase();

        // 不在白名单的标签，用其子节点替换
        if (!ALLOWED_TAGS.has(tagName)) {
          const parent = node.parentNode;
          while (node.firstChild) {
            parent.insertBefore(node.firstChild, node);
          }
          parent.removeChild(node);
          return;
        }

        // 过滤属性
        const attrs = Array.from(node.attributes);
        for (const attr of attrs) {
          const sanitized = sanitizeAttr(tagName, attr.name, attr.value);
          if (sanitized === null) {
            node.removeAttribute(attr.name);
          } else if (sanitized !== attr.value) {
            node.setAttribute(attr.name, sanitized);
          }
        }

        // 给外部链接加 rel
        if (tagName === 'a' && node.getAttribute('href')?.startsWith('http')) {
          node.setAttribute('rel', 'noopener noreferrer');
          node.setAttribute('target', '_blank');
        }

        // 递归处理子节点
        Array.from(node.childNodes).forEach(cleanNode);
      }

      Array.from(container.childNodes).forEach(cleanNode);
      return container.innerHTML;
    } catch (e) {
      console.warn('HTML 消毒失败，返回基础过滤结果:', e);
    }
  }

  return cleaned;
}

// 纯文本提取
export function htmlToText(html) {
  if (!html) return '';
  if (typeof document !== 'undefined') {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
