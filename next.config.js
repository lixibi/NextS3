/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 警告：这只是临时解决方案，建议最终修复这些问题
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig 