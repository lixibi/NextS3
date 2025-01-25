# S3Next

基于Next.js的S3文件管理器，支持PWA。

## 部署到Vercel

1. Fork 此仓库
2. 在Vercel中导入项目
3. 配置以下环境变量：
   - `NEXT_PUBLIC_AWS_REGION`: AWS区域
   - `NEXT_PUBLIC_AWS_ACCESS_KEY_ID`: AWS访问密钥ID
   - `NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY`: AWS秘密访问密钥
   - `NEXT_PUBLIC_AWS_BUCKET_NAME`: S3存储桶名称

## 本地开发

```bash
# 安装依赖
npm install

# 运行开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 特性

- ✨ 现代化UI界面
- 📱 PWA支持
- 🚀 快速文件上传/下载
- 📂 文件管理
- 🔒 安全的AWS认证

## 技术栈

- Next.js 14
- TypeScript
- Tailwind CSS
- AWS SDK
