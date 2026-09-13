# CloudMail Frontend v1.0.0

## 概述

基于 Next.js + Cloudflare Pages 构建的私人邮箱前端，后端使用 [CloudMail](https://github.com/maillab/cloud-mail)。

## 本次更新内容

### 新功能
- **首次使用安装向导** (`/setup`)：第一次打开引导配置站点名、API地址、域名、管理员邮箱
- **附件上传**：支持最大 100MB 单文件，带上传进度条，最多 10 个附件
- **浏览器标题未读数**：标签页标题实时显示未读邮件数
- **发件人首字母头像**：每个邮件自动生成彩色头像，颜色按邮箱稳定分配
- **PWA 支持**：可安装到手机桌面，离线可用

### 界面优化
- **加载骨架屏**：邮件列表加载时显示骨架屏占位，替代转圈
- **空状态优化**：收件箱为空时显示引导按钮"写一封新邮件"
- **深色模式完善**：
  - 邮件 HTML 内容自动适配深色（之前收到的邮件自带白底会突兀）
  - 滚动条深色模式适配
  - 选中文本颜色优化
  - 移动端点击高亮去除
- **响应式适配**：完美支持手机/平板/桌面

### 安全加固
- XSS 防护：HTML 邮件内容净化，禁止 style/@import/behavior 等危险属性
- 注册接口白名单校验：用户名格式严格限制
- CORS 白名单：只允许配置的域名跨域访问
- 管理员权限隔离：仅管理员邮箱可访问后台

### 多域名支持
- 支持多个邮箱域名（默认配置 3 个）
- 所有域名共享同一套配置，无需重复安装

## 技术栈
- Next.js 14 (App Router) + Static Export
- Tailwind CSS
- Cloudflare Pages 部署
- Cloudflare Workers 后端

## 快速部署
1. Fork 本仓库
2. 在 Cloudflare Pages 连接 GitHub 仓库
3. 构建命令 `npm run build`，输出目录 `out`
4. 首次访问会自动跳安装向导

## 在线体验
https://mail.freefufu.qzz.io/
