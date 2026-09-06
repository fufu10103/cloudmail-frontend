// Cloudflare Pages Functions - 注册接口
// 管理员密码通过 Pages 环境变量 ADMIN_EMAIL 和 ADMIN_PASSWORD 配置，不会暴露在前端
// 在 Cloudflare Dashboard -> Pages -> 你的项目 -> Settings -> Environment variables 里添加

export async function onRequestPost(context) {
  const { request, env } = context;

  // 动态获取请求来源，限制 CORS（同域部署时不需要跨域）
  const origin = request.headers.get('Origin') || '';
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin || 'same-origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };

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
    if (password.length < 6) {
      return new Response(JSON.stringify({ code: 400, message: '密码至少6位' }), { status: 400, headers });
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
    // 允许的域名列表
    const ALLOWED_DOMAINS = (env.ALLOWED_DOMAINS || 'mailfufu1.qzz.io,mailfufu.dpdns.org,gorebox.dpdns.org').split(',').map(s => s.trim());
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
      return new Response(JSON.stringify({ code: 500, message: '管理员登录失败' }), { status: 500, headers });
    }
    const adminToken = loginData.data.token;

    // 2. 创建用户
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
    return new Response(JSON.stringify({ code: 500, message: '服务器错误: ' + err.message }), { status: 500, headers });
  }
}

// 处理 OPTIONS 预检
export async function onRequestOptions(context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  return new Response(null, { status: 204, headers });
}
