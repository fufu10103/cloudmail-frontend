'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CONFIG, makeEndpoints } from '@/lib/config';
import { isLoggedIn, getCurrentUser, authFetch, getAccountId, refreshUserInfo } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { formatFileSize } from '@/lib/email';
import ThemeToggle from '@/components/ThemeToggle';

// 单个附件大小上限 100MB（Cloudflare Workers 请求体上限），数量上限 10
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MAX_FILE_COUNT = 10;

function ComposeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const settings = getSettings();
  const ep = makeEndpoints(settings.apiBase);
  const fileInputRef = useRef(null);

  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [cc, setCc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [accountId, setAccountId] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [attachments, setAttachments] = useState([]); // {filename, content(base64), type, size}
  const [replyInfo, setReplyInfo] = useState(null); // {sendType, emailId}

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login');
      return;
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const init = async () => {
    let aid = getAccountId();
    let info = null;
    if (!aid) {
      info = await refreshUserInfo();
      aid = info?.account?.accountId;
    }
    setAccountId(aid);
    // 加载账号列表用于选择发件账号
    try {
      const res = await authFetch(`${ep.ACCOUNT_LIST}?size=30`);
      const data = await res.json();
      if (data.code === 200 && Array.isArray(data.data)) setAccounts(data.data);
    } catch (e) { /* 忽略 */ }

    // 回复 / 转发预填
    const replyTo = searchParams.get('to');
    const replyId = searchParams.get('reply');
    const forwardId = searchParams.get('forward');
    if (replyTo) setTo(replyTo);
    if (replyId) {
      setReplyInfo({ sendType: 'reply', emailId: Number(replyId) });
      const s = searchParams.get('subject');
      if (s) setSubject(s.startsWith('Re:') ? s : `Re: ${s}`);
    }
    if (forwardId) {
      setReplyInfo({ sendType: 'forward', emailId: Number(forwardId) });
      await loadForwardMail(Number(forwardId), aid);
    }
  };

  // 加载要转发的邮件
  const loadForwardMail = async (emailId, aid) => {
    try {
      const res = await authFetch(`${ep.EMAIL_LIST}?accountId=${aid}&type=0&size=1&full=1&emailId=${emailId + 1}`);
      const data = await res.json();
      const mail = data.data?.list?.find(m => m.emailId === emailId);
      if (mail) {
        setSubject(`Fwd: ${mail.subject || ''}`);
        setContent(`\n\n---------- 转发邮件 ----------\n发件人：${mail.sendEmail || ''}\n时间：${mail.createTime || ''}\n主题：${mail.subject || ''}\n\n${(mail.text || mail.content || '').replace(/<[^>]+>/g, '')}`);
      }
    } catch (e) { /* 忽略 */ }
  };

  // ============ 附件处理 ============
  const readFileAsBase64 = (file, onProgress) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (ev) => {
      if (onProgress && ev.lengthComputable) {
        onProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };
    reader.onload = () => {
      const result = reader.result || '';
      const base64 = String(result).split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    setError('');
    if (attachments.length + files.length > MAX_FILE_COUNT) {
      setError(`最多只能添加 ${MAX_FILE_COUNT} 个附件`);
      return;
    }
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`文件「${file.name}」超过 100MB 上限（当前 ${formatFileSize(file.size)}）`);
        continue;
      }
      // 先占位，带进度
      const placeholder = {
        filename: file.name.slice(0, 200),
        content: '',
        type: file.type || 'application/octet-stream',
        size: file.size,
        progress: 0,
        reading: true
      };
      setAttachments(prev => [...prev, placeholder]);
      try {
        const base64 = await readFileAsBase64(file, (pct) => {
          setAttachments(prev => prev.map(a =>
            a.filename === placeholder.filename && a.size === placeholder.size
              ? { ...a, progress: pct } : a
          ));
        });
        setAttachments(prev => prev.map(a =>
          a.filename === placeholder.filename && a.size === placeholder.size
            ? { ...a, content: base64, progress: 100, reading: false } : a
        ));
      } catch (e) {
        setAttachments(prev => prev.filter(a => a !== placeholder));
        setError(`文件「${file.name}」读取失败`);
      }
    }
  };

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  // 简单邮箱格式校验
  const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  const handleSend = async (e) => {
    e.preventDefault();
    setError('');

    if (!to.trim()) { setError('请填写收件人'); return; }
    const receiveEmail = to.split(/[,;，；]/).map(s => s.trim()).filter(Boolean);
    const ccList = cc.split(/[,;，；]/).map(s => s.trim()).filter(Boolean);
    const allRecipients = [...receiveEmail, ...ccList];
    if (allRecipients.some(x => !isValidEmail(x))) {
      setError('存在格式不正确的邮箱地址');
      return;
    }
    if (!subject.trim()) { setError('请填写主题'); return; }
    if (!accountId) { setError('未获取到邮箱账号信息，请重新登录'); return; }

    setSending(true);
    try {
      const payload = {
        accountId,
        receiveEmail,
        subject: subject.trim(),
        content: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.8; color: #333; white-space: pre-wrap;">${content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>`,
        text: content,
        attachments: attachments.map(a => ({ filename: a.filename, content: a.content, type: a.type }))
      };
      if (replyInfo?.sendType === 'reply') {
        payload.sendType = 'reply';
        payload.emailId = replyInfo.emailId;
      }
      const res = await authFetch(ep.EMAIL_SEND, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.code === 200) {
        router.push('/mailbox');
      } else {
        setError(data.message || '发送失败');
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setSending(false);
    }
  };

  const siteName = settings.siteName || CONFIG.SITE_NAME;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* 顶栏 */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 md:px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 md:gap-4">
          <Link href="/mailbox" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h1 className="text-base md:text-lg font-semibold text-gray-800 dark:text-gray-100">
              {replyInfo?.sendType === 'reply' ? '回复邮件' : '写邮件'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
              {getCurrentUser()?.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium text-gray-700 dark:text-gray-300 hidden md:inline">{getCurrentUser()}</span>
          </div>
        </div>
      </header>

      {/* 编辑区 */}
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          {error && (
            <div className="mx-4 md:mx-6 mt-5 p-3.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-center gap-2 animate-fade-in">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form
            onSubmit={handleSend}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            className="p-4 md:p-6"
          >
            {/* 发件账号 */}
            {accounts.length > 1 && (
              <div className="flex items-center border-b border-gray-100 dark:border-gray-800 py-3">
                <label className="w-16 md:w-20 text-sm font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">发件</label>
                <select
                  value={accountId || ''}
                  onChange={(e) => setAccountId(Number(e.target.value))}
                  className="flex-1 outline-none bg-transparent text-sm text-gray-800 dark:text-gray-100"
                >
                  {accounts.map(a => <option key={a.accountId} value={a.accountId}>{a.email}</option>)}
                </select>
              </div>
            )}

            {/* 收件人 */}
            <div className="flex items-center border-b border-gray-100 dark:border-gray-800 py-3">
              <label className="w-16 md:w-20 text-sm font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">收件人</label>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="flex-1 outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-transparent text-sm md:text-base"
                placeholder="输入收件人邮箱，多个用逗号分隔"
              />
              <button type="button" onClick={() => setShowCc(!showCc)} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 ml-2 flex-shrink-0">
                {showCc ? '隐藏抄送' : '添加抄送'}
              </button>
            </div>

            {showCc && (
              <div className="flex items-center border-b border-gray-100 dark:border-gray-800 py-3 animate-fade-in">
                <label className="w-16 md:w-20 text-sm font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">抄送</label>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  className="flex-1 outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-transparent text-sm md:text-base"
                  placeholder="输入抄送邮箱"
                />
              </div>
            )}

            {/* 主题 */}
            <div className="flex items-center border-b border-gray-100 dark:border-gray-800 py-3">
              <label className="w-16 md:w-20 text-sm font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">主题</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="flex-1 outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-transparent text-base"
                placeholder="输入邮件主题"
              />
            </div>

            {/* 正文 */}
            <div className="py-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-64 md:h-80 outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none bg-transparent leading-relaxed text-sm md:text-base"
                placeholder="在这里输入邮件内容..."
              />
            </div>

            {/* 附件列表 */}
            {attachments.length > 0 && (
              <div className="space-y-2 pb-3">
                {attachments.map((att, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 dark:text-gray-200 truncate">{att.filename}</p>
                      {att.reading ? (
                        <div className="mt-1">
                          <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all duration-200" style={{ width: `${att.progress || 0}%` }}></div>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{att.progress || 0}% · {formatFileSize(att.size)}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">{formatFileSize(att.size)}</p>
                      )}
                    </div>
                    <button type="button" onClick={() => removeAttachment(idx)} className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 操作栏 */}
            <div className="flex items-center justify-between pt-4 md:pt-5 border-t border-gray-100 dark:border-gray-800 gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
                />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 transition flex items-center gap-1.5" title="添加附件（最多10个，单个100MB）">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  {attachments.length > 0 && <span className="text-xs">{attachments.length}/10</span>}
                </button>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                <Link href="/mailbox" className="px-4 md:px-5 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition font-medium">
                  取消
                </Link>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 md:px-7 py-2.5 btn-gradient text-white text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center gap-2"
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      发送中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      发送
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
          邮件通过 {siteName} 安全加密发送 · 附件单个最大 100MB（最多10个）
        </p>
      </div>
    </div>
  );
}

export default function ComposePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-950" />}>
      <ComposeForm />
    </Suspense>
  );
}
