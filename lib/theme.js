// 主题管理工具 - 深色/浅色模式

const THEME_KEY = 'cloudmail_theme';

// 获取当前主题
export function getTheme() {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) return saved;
  // 跟随系统偏好
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

// 应用主题
export function applyTheme(theme) {
  if (typeof window === 'undefined') return;
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  localStorage.setItem(THEME_KEY, theme);
}

// 切换主题
export function toggleTheme() {
  const current = getTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

// 初始化主题（在页面加载时调用）
export function initTheme() {
  if (typeof window === 'undefined') return;
  applyTheme(getTheme());
}
