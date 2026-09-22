// HTML 消毒：邮件正文的“防御纵深”
// 第一道防线是把邮件放进 <iframe sandbox>（见 components/EmailFrame.js），本文件是第二道防线。
// 原则：标签/属性/样式全部走白名单；非 HTML 命名空间（svg/math 等）整体丢弃，
// 杜绝 foreign-content 型 mXSS；任何异常都返回空串，绝不回退到“正则清洗结果”。

const XHTML_NS = 'http://www.w3.org/1999/xhtml';

// display: contents 等可破坏布局的取值一律不放行；只保留排版类标签
const ALLOWED_TAGS = new Set([
  'p', 'br', 'div', 'span', 'a', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'small', 'big', 'sub', 'sup', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'kbd', 'samp', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  'img', 'font', 'center', 'figure', 'figcaption',
  'article', 'section', 'aside', 'nav', 'header', 'footer', 'main'
]);

// 连同子内容一起丢弃：脚本、样式、表单、媒体、元数据、框架
const DROP_TAGS = new Set([
  'script', 'style', 'link', 'meta', 'base', 'title', 'head', 'noscript', 'noembed',
  'noframes', 'template', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet',
  'param', 'portal', 'form', 'input', 'button', 'select', 'option', 'optgroup',
  'datalist', 'fieldset', 'legend', 'textarea', 'keygen', 'audio', 'video', 'source',
  'track', 'picture', 'slot', 'canvas', 'map', 'area', 'marquee'
]);

// 全局允许的属性（class 在沙箱文档内只会命中邮件自己的样式，无法命中宿主页面）
const GLOBAL_ATTRS = new Set(['class', 'align', 'dir', 'title', 'lang', 'width', 'height']);

// 按标签额外允许的属性
const TAG_ATTRS = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'border', 'hspace', 'vspace']),
  td: new Set(['colspan', 'rowspan', 'align', 'valign', 'bgcolor', 'nowrap']),
  th: new Set(['colspan', 'rowspan', 'align', 'valign', 'bgcolor', 'nowrap']),
  table: new Set(['border', 'cellpadding', 'cellspacing', 'bgcolor']),
  col: new Set(['span']),
  colgroup: new Set(['span']),
  font: new Set(['color', 'size', 'face']),
  ol: new Set(['type', 'start']),
  ul: new Set(['type']),
  li: new Set(['type', 'value'])
};

// style 允许的 CSS 属性白名单。position/top/left/right/bottom/z-index/transform/
// float/display/background-image/text-indent/clip/overflow/cursor/filter 等
// 均不在名单内：邮件既不能覆盖宿主 UI，也不能用 CSS 外联做数据外带。
const STYLE_PROPS = new Set([
  'color', 'background-color', 'background', 'opacity',
  'font', 'font-family', 'font-size', 'font-weight', 'line-height',
  'text-align', 'text-decoration', 'text-transform', 'text-shadow',
  'text-indent', 'letter-spacing', 'word-spacing', 'word-break', 'word-wrap',
  'overflow-wrap', 'white-space', 'vertical-align', 'direction',
  'margin', 'padding', 'width', 'height', 'max-width', 'min-width', 'max-height',
  'border', 'border-collapse', 'border-spacing', 'border-radius',
  'table-layout', 'list-style', 'list-style-type'
]);
const STYLE_PROP_PREFIXES = ['margin-', 'padding-', 'border-', 'text-', 'font-', 'list-style-'];

function isAllowedStyleProp(prop) {
  const name = prop.replace(/^-(?:webkit|moz|ms|o)-/, '');
  if (STYLE_PROPS.has(name)) return true;
  return STYLE_PROP_PREFIXES.some((prefix) => name.startsWith(prefix));
}

// 样式值：禁止引号/$大括号/反斜杠/@/控制字符，以及 url() 等一切外联函数
function isSafeStyleValue(value) {
  if (!value || value.length > 512) return false;
  if (/[\u0000-\u001f\u007f"'\\{}@]/.test(value)) return false;
  if (/\burl\b|expression|javascript|vbscript|behaviou?r|import|attr\s*\(|calc\s*\(|image\s*\(|element\s*\(/i.test(value)) {
    return false;
  }
  return true;
}

function sanitizeStyle(value) {
  if (typeof value !== 'string') return '';
  const kept = [];
  for (const declaration of value.split(';')) {
    const idx = declaration.indexOf(':');
    if (idx < 0) continue;
    const prop = declaration.slice(0, idx).trim().toLowerCase();
    const val = declaration.slice(idx + 1).trim();
    if (!prop || !val) continue;
    if (!isAllowedStyleProp(prop)) continue;
    if (!isSafeStyleValue(val)) continue;
    kept.push(`${prop}:${val}`);
  }
  return kept.join(';');
}

// URL 白名单：邮件在 srcdoc 里没有可用 base，因此相对地址必须已由调用方绝对化
function safeUrl(raw, options, isImage) {
  if (typeof raw !== 'string') return '';
  const value = raw.replace(/[\t\n\r\f\u0000-\u0020\u007f]/g, '').trim();
  if (!value || value.length > 4096) return '';

  if (value.startsWith('//')) return '';
  if (/^data:/i.test(value)) {
    const inlined = /^data:image\/(png|jpe?g|gif|webp|bmp);base64,[a-z0-9+/=]+$/i.test(value);
    return isImage && options.allowDataImage && inlined ? value : '';
  }
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) return '';

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return '';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
  // 远程图片默认屏蔽：未点“显示图片”时不发任何跨站请求，避免读信即泄露 IP
  // 远程图片默认屏蔽：不点「显示图片」就不会向第三方发起请求（避免读信即泄露 IP）。
  // 例外是后端自己域名下的图片（附件内联图等），它们不构成第三方跟踪，默认放行。
  const sameSite = isImage && options.allowOrigins && options.allowOrigins.has(parsed.origin);
  if (isImage && !options.allowRemote && !sameSite) return '';
  return parsed.href;
}

function cleanNode(node, options) {
  if (node.nodeType === 3) return;
  if (node.nodeType !== 1) {
    node.remove();
    return;
  }
  // svg/math 等命名空间整体丢弃（foreign-content 是 mXSS 的主要来源）
  if (node.namespaceURI !== XHTML_NS) {
    node.remove();
    return;
  }

  const tag = node.tagName.toLowerCase();
  if (DROP_TAGS.has(tag)) {
    node.remove();
    return;
  }

  // 自底向上：先清子节点，这样 unwrap 后子节点已经是安全的
  Array.from(node.childNodes).forEach((child) => cleanNode(child, options));

  if (!ALLOWED_TAGS.has(tag)) {
    const parent = node.parentNode;
    if (!parent) return;
    Array.from(node.childNodes).forEach((child) => parent.insertBefore(child, node));
    parent.removeChild(node);
    return;
  }

  for (const attr of Array.from(node.attributes)) {
    const name = attr.name.toLowerCase();
    if (name === 'style') {
      const cleaned = sanitizeStyle(attr.value);
      if (cleaned) node.setAttribute('style', cleaned);
      else node.removeAttribute('style');
      continue;
    }
    if (GLOBAL_ATTRS.has(name)) continue;
    if (name === 'href') {
      const url = safeUrl(attr.value, options, false);
      if (url) node.setAttribute('href', url);
      else node.removeAttribute(attr.name);
      continue;
    }
    if (name === 'src') {
      const url = safeUrl(attr.value, options, true);
      if (url) node.setAttribute('src', url);
      else node.removeAttribute(attr.name);
      continue;
    }
    const perTag = TAG_ATTRS[tag];
    const allowed = (perTag && perTag.has(name)) || GLOBAL_ATTRS.has(name);
    if (!allowed) node.removeAttribute(attr.name);
  }

  if (tag === 'a') {
    if (node.getAttribute('href')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    } else {
      node.removeAttribute('target');
      node.removeAttribute('rel');
    }
  }
}

// options.allowRemote：用户显式选择“显示图片”时为 true
export function sanitizeHtml(html, options = {}) {
  if (!html || typeof html !== 'string') return '';
  if (typeof document === 'undefined') return '';

  const opts = {
    allowRemote: options.allowRemote === true,
    allowDataImage: options.allowDataImage !== false,
    allowOrigins: new Set(Array.isArray(options.allowOrigins) ? options.allowOrigins : [])
  };

  try {
    const doc = new DOMParser().parseFromString(`<!DOCTYPE html><div>${html}</div>`, 'text/html');
    const container = doc.body && doc.body.firstElementChild;
    if (!container) return '';
    Array.from(container.childNodes).forEach((child) => cleanNode(child, opts));
    return container.innerHTML;
  } catch (e) {
    console.warn('HTML 消毒异常，已放弃渲染该邮件正文:', e);
    return '';
  }
}

// 纯文本提取：必须用 DOMParser（惰性文档不会加载图片、不会触发事件处理器），
// 绝不能用 element.innerHTML —— 那等于一个隐式的 HTML 注入 sink
export function htmlToText(html) {
  if (!html || typeof html !== 'string') return '';
  if (typeof document !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,style').forEach((node) => node.remove());
    return (doc.body && doc.body.textContent) || '';
  }
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&/g, ' ');
}