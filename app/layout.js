import './globals.css';
import { Inter } from 'next/font/google';
import PWARegister from '@/components/PWARegister';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'CloudMail - 你的私人邮箱',
  description: '安全、私密、属于你自己的邮箱服务',
  manifest: '/manifest.webmanifest',
  applicationName: 'CloudMail',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CloudMail'
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg'
  }
};

// 主题初始化脚本 - 在页面渲染前执行，避免闪烁
const themeInitScript = `
(function() {
  try {
    var theme = localStorage.getItem('cloudmail_theme');
    if (!theme) {
      theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {}
})();
`;

export const viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300`}>
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
