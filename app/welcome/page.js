'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSettings } from '@/lib/settings';
import ThemeToggle from '@/components/ThemeToggle';

export default function WelcomePage() {
  const router = useRouter();
  const settings = getSettings();
  const [scrolled, setScrolled] = useState(false);
  const [dontShow, setDontShow] = useState(false);
  const siteName = settings.siteName || 'CloudMail';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleEnter = () => {
    if (dontShow) {
      localStorage.setItem('cloudmail_welcome_shown', 'true');
    }
    router.push('/login');
  };

  const features = [
    {
      title: '多域名支持',
      desc: '支持多个邮箱域名，一个账号管理所有域名的邮箱'
    },
    {
      title: '安全加密',
      desc: '全程 HTTPS 加密传输，Cloudflare Turnstile 人机验证防滥用'
    },
    {
      title: '管理后台',
      desc: '完善的用户管理、系统设置、域名配置，一切尽在掌控'
    },
    {
      title: '极速体验',
      desc: '基于 Next.js 静态导出，部署在 Cloudflare Pages，全球极速访问'
    }
  ];

  const stats = [
    { value: '3+', label: '邮箱域名' },
    { value: '99.9%', label: '可用性' },
    { value: '∞', label: '用户容量' },
    { value: '0', label: '广告追踪' }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-black dark:text-white font-sans transition-colors duration-300">
      {/* 顶部导航 - 滚动后显示 */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white dark:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-semibold text-lg">{siteName}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={handleEnter}
              className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition"
            >
              进入邮箱
            </button>
          </div>
        </div>
      </header>

      {/* Hero 区域 */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-16">
        <div className="text-center max-w-4xl mx-auto animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gray-100 rounded-full text-sm text-gray-600 mb-8">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            全新版本已上线
          </div>

          <h1 className="text-6xl md:text-8xl font-bold tracking-tight leading-[0.95] mb-6">
            你的邮箱，
            <br />
            <span className="text-gray-400">你做主。</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-500 max-w-2xl mx-auto mb-12 leading-relaxed">
            {siteName} 是一个安全、私密、完全自主可控的邮箱系统。
            多域名支持、完善的管理后台、全球极速访问。
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleEnter}
              className="px-8 py-4 bg-black text-white text-lg font-medium rounded-full hover:bg-gray-800 transition shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
            >
              立即开始 →
            </button>
            <a
              href="#features"
              className="px-8 py-4 text-gray-600 text-lg font-medium rounded-full hover:bg-gray-100 transition"
            >
              了解更多
            </a>
          </div>

          <label className="flex items-center gap-2 mt-8 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
              className="rounded border-gray-300 text-black focus:ring-black"
            />
            不再显示此页面
          </label>
        </div>

        {/* 向下滚动提示 */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* 数据统计 */}
      <section className="py-24 px-6 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-5xl md:text-6xl font-bold tracking-tight mb-2">{stat.value}</div>
                <div className="text-gray-500 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 功能特性 */}
      <section id="features" className="py-24 px-6 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              为你而生
            </h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              每一个功能都经过精心设计，只为给你最好的邮箱体验
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="p-8 bg-gray-50 rounded-3xl hover:bg-gray-100 transition group cursor-default"
              >
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                  <span className="text-white font-bold text-lg">{idx + 1}</span>
                </div>
                <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-500 text-lg leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 引用语 */}
      <section className="py-24 px-6 border-t border-gray-100 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
          <blockquote className="text-3xl md:text-4xl font-medium leading-snug tracking-tight mb-8">
            "邮箱不只是通讯工具，<br />更是你数字身份的基石。"
          </blockquote>
          <p className="text-gray-500 text-lg">— {siteName} 团队</p>
        </div>
      </section>

      {/* CTA 区域 */}
      <section className="py-32 px-6 border-t border-gray-100">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            准备好了吗？
          </h2>
          <p className="text-xl text-gray-500 mb-12">
            立即进入 {siteName}，开启你的专属邮箱之旅
          </p>
          <button
            onClick={handleEnter}
            className="px-10 py-5 bg-black text-white text-xl font-medium rounded-full hover:bg-gray-800 transition shadow-2xl hover:shadow-black/25 hover:-translate-y-1"
          >
            进入邮箱 →
          </button>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="py-8 px-6 border-t border-gray-100">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-black rounded-md flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-medium text-sm text-gray-600">{siteName}</span>
          </div>
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} {siteName}. 安全 · 私密 · 自主可控
          </p>
        </div>
      </footer>
    </div>
  );
}
