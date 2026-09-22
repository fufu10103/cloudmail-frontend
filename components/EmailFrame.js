'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildEmailDoc, hasRemoteImages } from '@/lib/email';

const chip =
  'text-[11px] px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition whitespace-nowrap';

// 邮件正文渲染容器。
// 关键在于 sandbox 里没有 allow-scripts / allow-same-origin：
//   1) iframe 内的脚本与内联事件（onerror 等）一律不执行；
//   2) iframe 文档是隔离源，读不到宿主页面的 localStorage token、cookie 与 DOM。
// 因此即使消毒器被绕过，最多也只是把邮件自己那一片区域显示乱。
export default function EmailFrame({ content, text, apiBase, className = '' }) {
  const [doc, setDoc] = useState('');
  const [allowRemote, setAllowRemote] = useState(false);
  const [dark, setDark] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // 跟随宿主主题（沙箱内无法继承宿主 CSS，只能把状态传进去）
  useEffect(() => {
    const read = () => setDark(document.documentElement.classList.contains('dark'));
    read();
    if (typeof MutationObserver === 'undefined') return undefined;
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // srcDoc 只在客户端生成，避免静态导出产物与首屏渲染不一致触发 hydration 警告
  useEffect(() => {
    setDoc(buildEmailDoc({ html: content, text, apiBase, allowRemoteImages: allowRemote, dark }));
  }, [content, text, apiBase, allowRemote, dark]);

  // 切换邮件时收回上一次的展开/图片选择
  useEffect(() => {
    setAllowRemote(false);
    setExpanded(false);
  }, [content, text]);

  const remote = useMemo(() => hasRemoteImages(content, text), [content, text]);

  return (
    <div className={`border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 ${className}`}>
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40">
        <span className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">
          正文在沙箱中渲染，脚本与远程图片默认禁用
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {remote && (
            <button onClick={() => setAllowRemote((v) => !v)} className={chip}>
              {allowRemote ? '隐藏图片' : '显示图片'}
            </button>
          )}
          <button onClick={() => setExpanded((v) => !v)} className={chip}>
            {expanded ? '收起正文' : '展开正文'}
          </button>
        </div>
      </div>
      <iframe
        title="邮件正文"
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        srcDoc={doc}
        className="w-full border-0 bg-white dark:bg-gray-900"
        style={{ height: expanded ? '85vh' : '60vh', minHeight: 320 }}
      />
    </div>
  );
}