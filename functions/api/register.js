// Cloudflare Pages Functions - 注册接口
// 管理员密码通过 Pages 环境变量 ADMIN_EMAIL 和 ADMIN_PASSWORD 配置，不会暴露在前端
// 在 Cloudflare Dashboard -> Pages -> 你的项目 -> Settings -> Environment variables 里添加

// 用户名白名单：仅允许字母、数字、点、下划线、连字符，防止 CRLF / 邮件头注入与异常账号
const USERNAME_RE = /^[a-zA-Z0-9._-]{2,30}$/;
const MAX_PASSWORD_LEN = 64;

// 构造 CORS 头：仅允许同源或显式白名单来源，且不反射凭证
function buildCorsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  // 同源请求浏览器不会触发 CORS，这里只对白名单来源回显
  const allowOrigin = allowed.includes(origin) ? origin : '';
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };
  if (allowOrigin) headers['Access-Control-Allow-Origin'] = allowOrigin;
  return headers;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = buildCorsHeaders(request, env);

  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    const body = await request.json();
    const { username, password, domain, turnstileToken } = body;

    if (!username || !password) {
      return new Response(JSON.stringify({ code: 400, message: '用户名和密码不能为空' }), { status: 400, headers });
    }
    if (!USERNAME_RE.test(String(username))) {
      return new Response(JSON.stringify({ code: 400, message: '用户名仅支持 2-30 位字母、数字、点、下划线或连字符' }), { status: 400, headers });
    }
    if (password.length < 6 || password.length > MAX_PASSWORD_LEN) {
      return new Response(JSON.stringify({ code: 400, message: `密码长度需为 6-${MAX_PASSWORD_LEN} 位` }), { status: 400, headers });
    }

    // Cloudflare Turnstile 人机验证（配置了 TURNSTILE_SECRET_KEY 时启用）
    if (env.TURNSTILE_SECRET_KEY) {
      if (!turnstileToken) {
        return new Response(JSON.stringify({ code: 400, message: '请完成人机验证' }), { status: 400, headers });
      }
      const formData = new FormData();
      formData.append('secret', env.TURNSTILE_SECRET_KEY);
      formData.append('response', turnstileToken);
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: formData
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return new Response(JSON.stringify({ code: 400, message: '人机验证失败，请重试' }), { status: 400, headers });
      }
    }

    const API_BASE = env.API_BASE || 'https://www.mailfufu1.qzz.io';
    // 允许的域名列表（域名也做严格字符校验）
    const ALLOWED_DOMAINS = (env.ALLOWED_DOMAINS || 'mailfufu1.qzz.io,mailfufu.dpdns.org,gorebox.dpdns.org')
      .split(',')
      .map(s => s.trim())
      .filter(d => /^[a-zA-Z0-9.-]+$/.test(d));
    const MAIL_DOMAIN = (domain && ALLOWED_DOMAINS.includes(domain)) ? domain : ALLOWED_DOMAINS[0];
    const ADMIN_EMAIL = env.ADMIN_EMAIL;
    const ADMIN_PASSWORD = env.ADMIN_PASSWORD;

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ code: 500, message: '服务器未配置管理员凭证' }), { status: 500, headers });
    }

    // 1. 管理员登录获取 token
    const loginRes = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    const loginData = await loginRes.json();
    if (loginData.code !== 200 || !loginData.data?.token) {
      return new Response(JSON.stringify({ code: 500, message: '注册服务暂不可用' }), { status: 500, headers });
    }
    const adminToken = loginData.data.token;

    // 2. 创建用户（username 已通过白名单校验，domain 来自白名单，拼接安全）
    const email = `${username}@${MAIL_DOMAIN}`;
    const addRes = await fetch(`${API_BASE}/api/user/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': adminToken
      },
      body: JSON.stringify({ email, password })
    });
    const addData = await addRes.json();

    if (addData.code === 200) {
      return new Response(JSON.stringify({ code: 200, message: '注册成功', data: { email } }), { status: 200, headers });
    } else {
      return new Response(JSON.stringify({ code: addData.code || 400, message: addData.message || '注册失败' }), { status: 400, headers });
    }
  } catch (err) {
    // 内部错误细节只记录到服务端日志，不回传给客户端
    console.error('register error:', err);
    return new Response(JSON.stringify({ code: 500, message: '服务器繁忙，请稍后再试' }), { status: 500, headers });
  }
}

// 处理 OPTIONS 预检
export async function onRequestOptions(context) {
  const headers = buildCorsHeaders(context.request, context.env);
  return new Response(null, { status: 204, headers });
}
