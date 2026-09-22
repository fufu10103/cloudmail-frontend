// 主题初始化脚本（head 中同步加载，避免首屏闪烁）。
// 特意做成独立的外部文件：这样 CSP 的 script-src 只需要 'self'，
// 不必为了 <head> 里的内联脚本放开 'unsafe-inline'。
(function () {
  try {
    var theme = localStorage.getItem('cloudmail_theme');
    if (!theme) {
      theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {
    /* 隐私模式等场景下 localStorage 不可用，忽略 */
  }
})();