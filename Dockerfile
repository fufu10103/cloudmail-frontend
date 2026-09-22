# CloudMail Frontend - Docker 部署
# 多阶段构建：先 build，再用 nginx 托管静态文件

# 阶段1：构建
FROM node:20-alpine AS builder
WORKDIR /app

# 复制依赖文件并安装
# 注意：这里必须是完整安装（不能 --only=production），下一阶段要跑 next build，
# 依赖 tailwindcss / postcss / autoprefixer 这些 devDependencies。
COPY package.json package-lock.json ./
RUN npm ci

# 复制源码并构建
COPY . .
RUN npm run build

# 阶段2：运行
FROM nginx:alpine
# 安全响应头片段（必须在每个 location 内 include，nginx 的 add_header 不跨层继承）
RUN mkdir -p /etc/nginx/snippets
COPY docker/security-headers.conf /etc/nginx/snippets/security-headers.conf
# 复制构建产物
COPY --from=builder /app/out /usr/share/nginx/html
# 复制 nginx 配置
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]