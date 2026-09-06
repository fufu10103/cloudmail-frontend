# CloudMail 前端部署文档

本文档详细介绍如何将 CloudMail 前端部署到 Cloudflare Pages，并完成所有配置。

## 目录

- [前置准备](#前置准备)
- [快速部署](#快速部署)
- [环境变量配置](#环境变量配置)
- [域名配置](#域名配置)
- [Cloudflare Turnstile 人机验证](#cloudflare-turnstile-人机验证)
- [本地开发](#本地开发)
- [常见问题](#常见问题)

---

## 前置准备

在开始部署前，请确保你已经拥有：

1. **GitHub 账号** - 用于托管代码
2. **Cloudflare 账号** - 用于部署 Pages 和配置 Turnstile
3. **CloudMail 后端服务** - 已部署并可正常访问
4. **邮箱域名** - 至少一个域名，DNS 已配置好 MX 记录

### 后端要求

- CloudMail / SkyMail 后端 API 可正常访问
- 拥有管理员账号（用于注册时创建用户）

---

## 快速部署

### 方式一：Git 集成部署（推荐）

#### 1. Fork 或上传代码到 GitHub

```bash
# 克隆本仓库
git clone https://github.com/你的用户名/cloudmail-frontend.git
cd cloudmail-frontend

# 如果是自己的代码，推送到你的 GitHub 仓库
git remote set-url origin https://github.com/你的用户名/cloudmail-frontend.git
git push -u origin master
```

#### 2. 连接 Cloudflare Pages

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → **Create** → **Pages**
3. 点击 **Connect to Git**
4. 选择你的 `cloudmail-frontend` 仓库
5. 点击 **Begin setup**

#### 3. 构建设置

| 配置项 | 值 |
|--------|-----|
| **Project name** | `cloudmail-frontend`（自定义） |
| **Production branch** | `master` |
| **Framework preset** | `Next.js` (Static HTML Export) |
| **Build command** | `npm run build` |
| **Build output directory** | `out` |

#### 4. 点击 **Save and Deploy**

等待构建完成（通常 1-2 分钟），部署成功后会获得一个 `*.pages.dev` 域名。

---

## 环境变量配置

部署完成后，必须配置环境变量才能正常使用注册功能。

### 配置步骤

1. 进入 Cloudflare Pages 项目 → **Settings** → **Environment variables**
2. 在 **Production** 标签下，点击 **Add** 添加以下变量：

| 变量名 | 值 | 类型 | 必填 |
|--------|-----|------|------|
| `ADMIN_EMAIL` | `admin@你的域名` | Encrypt | ✅ |
| `ADMIN_PASSWORD` | 管理员密码 | Encrypt | ✅ |
| `API_BASE` | `https://www.你的后端域名` | Text | ❌ |
| `MAIL_DOMAIN` | `你的默认邮箱域名` | Text | ❌ |
| `ALLOWED_DOMAINS` | `域名1,域名2,域名3` | Text | ❌ |
| `TURNSTILE_SECRET_KEY` | Turnstile 密钥 | Encrypt | ❌ |

> **重要**：`ADMIN_PASSWORD` 和 `TURNSTILE_SECRET_KEY` 请务必选择 **Encrypt（加密）** 类型，不要用 Text。

### 变量说明

#### ADMIN_EMAIL
CloudMail 后端的管理员邮箱，用于注册时调用 `/api/user/add` 创建用户。

#### ADMIN_PASSWORD
管理员密码，与 `ADMIN_EMAIL` 对应。

#### API_BASE（可选）
CloudMail 后端 API 地址，不要加末尾斜杠。
- 默认值：`https://www.mailfufu1.qzz.io`
- 示例：`https://mail.example.com`

#### MAIL_DOMAIN（可选）
默认邮箱域名，用户注册时默认使用的域名。
- 默认值：`mailfufu1.qzz.io`

#### ALLOWED_DOMAINS（可选）
允许注册的域名列表，用英文逗号分隔。
- 默认值：`mailfufu1.qzz.io,mailfufu.dpdns.org,gorebox.dpdns.org`
- 示例：`example.com,mail.example.com`

#### TURNSTILE_SECRET_KEY（可选）
Cloudflare Turnstile 的 Secret Key，开启人机验证时必填。
- 详见 [Cloudflare Turnstile 人机验证](#cloudflare-turnstile-人机验证)

### 使环境变量生效

添加完环境变量后，需要重新部署才能生效：

1. 进入 **Deployments** 标签页
2. 找到最新的部署，点击右侧 **三个点** → **Retry deployment**
3. 等待重新部署完成

---

## 域名配置

### 添加自定义域名（可选）

如果你想使用自己的域名而不是 `*.pages.dev`：

1. 进入 Pages 项目 → **Custom domains** → **Set up a custom domain**
2. 输入你的域名，如 `mail.example.com`
3. 按照提示在 Cloudflare DNS 中添加 CNAME 记录
4. 等待 SSL 证书签发（通常几分钟）

### 邮箱域名 DNS 配置

确保你的邮箱域名已正确配置 MX 记录：

```
类型    名称    优先级    值
MX      @       10        mx.你的邮件服务商.com
TXT     @       -         v=spf1 include:_spf.你的邮件服务商.com ~all
TXT     _dmarc  -         v=DMARC1; p=none; rua=mailto:admin@你的域名
```

> 具体 MX 记录请参考你的 CloudMail 后端服务商文档。

---

## Cloudflare Turnstile 人机验证

开启人机验证可以有效防止恶意注册和脚本攻击。

### 1. 创建 Turnstile 站点

1. 进入 [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. 点击 **Create**（创建）
3. 填写配置：
   - **Site name**：`CloudMail`（自定义）
   - **Domain**：你的 Pages 域名，如 `cloudmail-frontend.pages.dev`
   - **Widget mode**：`Managed`（默认）
4. 点击 **Create**

### 2. 获取两个密钥

创建成功后会获得两个值：

| 名称 | 用途 | 填在哪里 |
|------|------|---------|
| **Site Key** | 前端验证组件 | 后台管理 → 系统设置 |
| **Secret Key** | 服务端验证 | Pages 环境变量 `TURNSTILE_SECRET_KEY` |

### 3. 配置 Site Key

1. 登录邮箱 → 进入 **管理后台** → **系统设置**
2. 打开 **启用人机验证** 开关
3. 将 **Site Key** 粘贴到输入框
4. 点击 **保存设置**

### 4. 配置 Secret Key

1. 进入 Pages 项目 → **Settings** → **Environment variables**
2. 添加变量：
   - 名称：`TURNSTILE_SECRET_KEY`
   - 值：你的 Secret Key
   - 类型：**Encrypt（加密）**
3. 保存后重新部署

### 5. 验证

打开注册页面，应该能看到 Cloudflare 验证小部件。如果没显示：
- 按 F12 查看控制台错误
- 确认 Site Key 正确
- 确认 Turnstile 后台配置的域名与实际访问域名一致

---

## 本地开发

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
```

构建产物在 `out/` 目录。

### 本地预览构建结果

```bash
npx serve out
```

---

## 项目结构

```
cloudmail-frontend/
├── app/
│   ├── layout.js              # 根布局
│   ├── page.js                # 首页（路由跳转）
│   ├── globals.css            # 全局样式
│   ├── login/
│   │   └── page.js            # 登录页
│   ├── register/
│   │   └── page.js            # 注册页
│   ├── welcome/
│   │   └── page.js            # 首次欢迎页
│   ├── mailbox/
│   │   └── page.js            # 邮箱主界面
│   ├── compose/
│   │   └── page.js            # 写邮件页
│   └── admin/
│       └── page.js            # 管理后台
├── functions/
│   └── api/
│       └── register.js        # 注册接口（Pages Functions）
├── lib/
│   ├── config.js              # 全局配置
│   ├── auth.js                # 认证工具函数
│   ├── settings.js            # 前端设置管理
│   └── sanitize.js            # XSS 消毒
├── public/                    # 静态资源
├── next.config.js             # Next.js 配置
├── tailwind.config.js         # Tailwind 配置
├── postcss.config.js          # PostCSS 配置
├── jsconfig.json              # 路径别名配置
├── package.json
└── README.md
```

---

## 常见问题

### 1. 注册时提示"服务器未配置管理员凭证"

**原因**：Pages 环境变量没有配置或没有生效。

**解决**：
1. 确认 `ADMIN_EMAIL` 和 `ADMIN_PASSWORD` 已添加到 Production 环境变量
2. 确认已重新部署（Retry deployment）
3. 确认变量名拼写正确

### 2. 登录后提示"未获取到邮箱账号信息"

**原因**：用户没有关联的邮箱账号，或 accountId 获取失败。

**解决**：
1. 确认该用户在 CloudMail 后台有邮箱账号
2. 退出重新登录
3. 检查后端 `/api/my/loginUserInfo` 接口是否正常返回 account 信息

### 3. 发送邮件提示"权限不足"

**原因**：用户所属角色没有开启发件权限。

**解决**：
1. 登录 CloudMail 管理后台
2. 进入角色管理/权限管理
3. 打开对应用户角色的**发件权限**
4. 发件次数限制设为 `0`（不限制）

### 4. Turnstile 验证不显示

**原因**：Site Key 错误或域名不匹配。

**解决**：
1. 确认 Site Key 正确无误
2. 确认 Turnstile 后台配置的域名包含实际访问域名（`*.pages.dev` 和自定义域名都要加）
3. 按 F12 查看控制台具体错误信息

### 5. 构建失败，提示模块找不到

**原因**：依赖未安装或路径别名配置错误。

**解决**：
```bash
rm -rf node_modules .next
npm install
npm run build
```

### 6. 如何重置欢迎页

欢迎页只在第一次访问时显示，如果想重新看到：

- 浏览器清除 localStorage 中的 `cloudmail_welcome_shown`
- 或使用无痕模式访问

### 7. 如何修改前端配置（API地址、域名等）

有两种方式：

**方式一：后台设置（推荐）**
- 登录邮箱 → 管理后台 → 系统设置
- 修改后保存在浏览器 localStorage，换设备需要重新配置

**方式二：修改代码默认值**
- 编辑 `lib/config.js` 和 `lib/settings.js`
- 修改后重新构建部署

---

## 技术栈

- **框架**: Next.js 14 (App Router) - 静态导出
- **样式**: Tailwind CSS 3
- **认证**: JWT Token (localStorage)
- **后端**: Cloudflare Pages Functions
- **部署**: Cloudflare Pages
- **安全**: XSS 消毒、CORS 限制、安全响应头、Turnstile 人机验证

---

## 许可证

MIT License

---

如有问题，请提交 Issue 或联系管理员。
