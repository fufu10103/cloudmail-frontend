/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare Pages 静态导出模式
  output: 'export',
  images: {
    unoptimized: true
  },
  trailingSlash: true,
  // 禁用 Next.js 服务端特性，纯静态部署
  experimental: {
    // 确保不使用需要 Node.js 运行时的功能
  }
};

module.exports = nextConfig;
