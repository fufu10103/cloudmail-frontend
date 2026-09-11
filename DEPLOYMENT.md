# CloudMail 前端部署文档

本文档详细介绍如何将 CloudMail 前端部署到 Cloudflare Pages，并完成所有配置。

## 目录

- [功能特性](#功能特性)
- [前置准备](#前置准备)
- [快速部署](#快速部署)
- [环境变量配置](#环境变量配置)
- [域名配置](#域名配置)
- [Cloudflare Turnstile 人机验证](#cloudflare-turnstile-人机验证)
- [PWA 安装到手机桌面](#pwa-安装到手机桌面)
- [本地开发](#本地开发)
- [常见问题](#常见问题)

---

## 功能特性

**邮件收发**
- 收件箱 / 已发送 / 星标邮件分类，游标分页"加载更多"
- 邮件删除（单个 / 批量勾选）、星标 / 取消星标、打开自动标已读
- 写邮件支持附件上传发送（单个 ≤25MB、最多 10 个）、回复 / 转发预填、抄送、多发件账号切换
- 附件在线下载、收件附件预览
- **验证码一键提取**：自动识别邮件正文中的验证码，顶部高亮并一键复制
- 新邮件自动轮询刷新 + 浏览器桌面通知（点击铃铛授权）
- 键盘快捷键：`J/K` 或上下方向键切换、`S` 星标、`R` 回复、`D/Delete` 删除、`Esc` 返回
- 一个账号绑定多个邮箱地址并快速切换（需后端开启多号模式）

**个人设置（/settings）**
- 修改密码、发件签名、多邮箱管理（添加 / 备注 / 合并收件 / 删除）、注销账号

**管理后台（/admin，仅管理员）**
- 系统概览：用户与邮件统计卡片、收件量 Top5 图表、最近注册
- 用户管理：收发件量、邮箱数、最近活跃、IP 与设备信息，禁用 / 启用 / 删除
- 全部邮件：按收件 / 发件 / 全部 / 已删除 / 无人收件筛选、主题搜索、查看与永久删除
- 系统设置：站点名、API 地址、域名管理、Turnstile 开关（纯前端配置，存浏览器本地）

**体验与安全**
- 全站深色模式、移动端响应式（侧边栏抽屉）
- PWA 支持，可"安装"到手机 / 桌面（见下节）
- 邮件正文 HTML 白名单消毒防 XSS、附件 URL 防路径穿越、注册接口用户名白名单防邮件头注入、Service Worker 不缓存任何接口与附件

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

#### ALLOWED_ORIGINS（可选）
允许跨域调用注册接口的来源白名单，英文逗号分隔。**同源部署时无需配置**；仅当你的前端页面与 Pages Functions 不同源时才需要填写，例如 `https://mail.example.com,https://www.example.com`。留空时注册接口只接受同源请求，更安全。

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

## PWA 安装到手机桌面

本项目已内置 PWA（manifest + Service Worker），部署到 **HTTPS** 域名后即可像原生 App 一样安装，无需开发原生应用。

**Android（Chrome / Edge）**
1. 用浏览器打开你的邮箱站点并登录
2. 点击浏览器菜单（右上角三个点）→ **添加到主屏幕** / **安装应用**
3. 桌面会出现 CloudMail 图标，打开后为独立窗口、无浏览器地址栏

**iOS（Safari）**
1. 用 Safari 打开站点并登录
2. 点击底部分享按钮 → **添加到主屏幕** → **添加**
3. 从桌面图标进入即全屏运行

**电脑端（Chrome / Edge）**
- 地址栏右侧会出现"安装"图标，点击即可安装为桌面应用

> 说明：Service Worker 只缓存页面外壳与静态资源，**不会缓存任何邮件接口数据和附件**，退出登录后不会在本机留下邮件内容，兼顾离线可打开与隐私安全。修改前端代码重新部署后，SW 会自动更新缓存版本。

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
