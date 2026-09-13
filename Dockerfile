# CloudMail Frontend - Docker 部署
# 多阶段构建：先 build，再用 nginx 托管静态文件

# 阶段1：构建
FROM node:20-alpine AS builder
WORKDIR /app

# 复制依赖文件并安装
COPY package.json package-lock.json ./
RUN npm ci --only=production

# 复制源码并构建
COPY . .
RUN npm run build

# 阶段2：运行
FROM nginx:alpine
# 复制构建产物
COPY --from=builder /app/out /usr/share/nginx/html
# 复制 nginx 配置
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
