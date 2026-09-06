# CloudMail 前端

一个基于 Next.js + Tailwind CSS 的邮箱系统前端，对接 CloudMail 后端 API，支持用户注册、登录、收发邮件和后台管理，可一键部署到 Cloudflare Pages。

## 功能特性

- 用户注册 / 登录 / 登出
- 邮箱收件箱、已发送、草稿箱、垃圾箱
- 写邮件、发送邮件
- 邮件详情查看
- 后台管理面板（用户管理、系统设置、数据概览）
- 响应式设计，移动端友好
- 纯静态导出 + Cloudflare Pages Functions（注册接口在服务端，管理员密码不暴露）
- 可部署到 Cloudflare Pages

## 技术栈

- **框架**: Next.js 14 (App Router)
- **样式**: Tailwind CSS 3
- **认证**: JWT Token (localStorage)
- **部署**: 静态导出 (output: export)

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置

编辑 `lib/config.js`，修改以下配置：

```js
export const CONFIG = {
  MAIL_DOMAIN: 'your-domain.com',      // 你的邮箱域名
  API_BASE: 'https://api.your-domain.com',  // CloudMail 后端 API 地址
  SITE_NAME: 'CloudMail'                 // 站点名称
};
```

### 3. 本地开发

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 构建生产版本

```bash
npm run build
```

构建产物在 `out/` 目录。

## 部署到 Cloudflare Pages

### 方式一：Git 集成（推荐）

1. 将本项目推送到 GitHub 仓库
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. 进入 **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
4. 选择你的仓库
5. 构建设置：
   - **Framework preset**: `Next.js` (Static HTML Export)
   - **Build command**: `npm run build`
   - **Build output directory**: `out`
6. 点击 **Save and Deploy**
7. 部署完成后，进入项目 **Settings** → **Environment variables**，添加以下变量（Production 和 Preview 都要加）：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `ADMIN_EMAIL` | `admin@你的域名` | 管理员邮箱，用于注册时创建用户 |
| `ADMIN_PASSWORD` | `管理员密码` | 管理员密码（加密存储，前端不可见） |
| `API_BASE` | `https://www.你的域名` | CloudMail 后端 API 地址（可选，默认已配置） |
| `MAIL_DOMAIN` | `你的域名` | 邮箱域名（可选，默认已配置） |

8. 添加完环境变量后，重新部署一次（**Deployments** → 最新部署 → **Retry deployment**）使变量生效

### 方式二：Wrangler CLI 部署

```bash
# 安装 wrangler
npm install -g wrangler

# 登录
wrangler login

# 构建
npm run build

# 部署
wrangler pages deploy out --project-name=cloudmail-frontend
```

## 项目结构

```
cloudmail-frontend/
├── app/
│   ├── layout.js          # 根布局
│   ├── page.js            # 首页（自动跳转）
│   ├── globals.css        # 全局样式
│   ├── login/
│   │   └── page.js        # 登录页
│   ├── register/
│   │   └── page.js        # 注册页
│   ├── mailbox/
│   │   └── page.js        # 邮箱主界面
│   ├── compose/
│   │   └── page.js        # 写邮件页
│   └── admin/
│       └── page.js        # 后台管理页
├── lib/
│   ├── config.js          # 全局配置
│   └── auth.js            # 认证工具函数
├── public/                # 静态资源
├── next.config.js         # Next.js 配置
├── tailwind.config.js     # Tailwind 配置
├── postcss.config.js      # PostCSS 配置
└── package.json
```

## API 对接说明

前端通过以下接口与 CloudMail 后端通信：

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/login` | POST | 用户登录，返回 token |
| `/api/auth/logout` | POST | 登出 |
| `/api/user/info` | GET | 获取用户信息 |
| `/api/mail/list` | GET | 获取邮件列表 |
| `/api/mail/detail` | GET | 获取邮件详情 |
| `/api/mail/send` | POST | 发送邮件 |
| `/api/mail/delete` | DELETE | 删除邮件 |
| `/api/admin/stats` | GET | 管理后台统计 |
| `/api/admin/users` | GET/POST | 用户列表/创建用户 |
| `/api/admin/users/:id` | DELETE | 删除用户 |

所有需要认证的接口需在请求头携带：`Authorization: Bearer <token>`

## 注意事项

1. **CORS**: 确保 CloudMail 后端允许你的前端域名跨域访问
2. **HTTPS**: 生产环境请使用 HTTPS，保护用户凭证
3. **API 地址**: `lib/config.js` 中的 `API_BASE` 不要加末尾斜杠
4. **静态导出**: 本项目使用 `output: 'export'`，不依赖 Node.js 服务端运行时，可部署到任意静态托管平台

## License

MIT
