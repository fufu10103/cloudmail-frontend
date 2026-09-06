// 前端设置管理（存储在 localStorage）
// 这些设置会覆盖 lib/config.js 中的默认配置

const SETTINGS_KEY = 'cloudmail_settings';

// 默认设置
const DEFAULT_SETTINGS = {
  apiBase: 'https://www.mailfufu1.qzz.io',
  mailDomain: 'mailfufu1.qzz.io',
  mailDomains: ['mailfufu1.qzz.io', 'mailfufu.dpdns.org', 'gorebox.dpdns.org'],
  siteName: 'CloudMail',
  turnstileEnabled: false,
  turnstileSiteKey: ''
};

// 获取所有设置
export function getSettings() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('读取设置失败:', e);
  }
  return DEFAULT_SETTINGS;
}

// 保存设置
export function saveSettings(settings) {
  if (typeof window === 'undefined') return;
  const current = getSettings();
  const merged = { ...current, ...settings };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  return merged;
}

// 重置为默认设置
export function resetSettings() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SETTINGS_KEY);
  return DEFAULT_SETTINGS;
}

// 获取单个配置值（优先使用 localStorage 中的设置）
export function getConfig(key) {
  const settings = getSettings();
  return settings[key] !== undefined ? settings[key] : DEFAULT_SETTINGS[key];
}

// 应用设置到当前页面（需要刷新才能完全生效）
export function applySettings() {
  if (typeof window === 'undefined') return;
  // 触发自定义事件，让页面监听设置变化
  window.dispatchEvent(new CustomEvent('settings-changed', { detail: getSettings() }));
}
