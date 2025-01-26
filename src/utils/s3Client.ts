import { S3Client } from "@aws-sdk/client-s3";

interface S3Config {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  region: string;
  bucket: string;
}

// 获取配置的函数
export function getS3Config(): S3Config {
  // 尝试获取本地配置
  if (typeof window !== 'undefined') {
    const localConfig = localStorage.getItem('s3Config');
    if (localConfig) {
      return JSON.parse(localConfig);
    }
  }

  // 回退到环境变量
  return {
    endpoint: process.env.NEXT_PUBLIC_S3_ENDPOINT || '',
    accessKey: process.env.NEXT_PUBLIC_S3_ACCESS_KEY || '',
    secretKey: process.env.NEXT_PUBLIC_S3_SECRET_KEY || '',
    region: process.env.NEXT_PUBLIC_S3_REGION || '',
    bucket: process.env.NEXT_PUBLIC_S3_BUCKET || ''
  };
}

// 创建 S3 客户端
export function createS3Client(): S3Client {
  const config = getS3Config();
  
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey
    },
    forcePathStyle: true,
    // 只保留必要的配置
    maxAttempts: 3,
    retryMode: 'standard'
  });
}

// 导出获取当前 bucket 的函数
export function getCurrentBucket(): string {
  return getS3Config().bucket;
}

// 导出一个函数来获取当前的 S3 客户端实例
let s3ClientInstance: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    s3ClientInstance = createS3Client();
  }
  return s3ClientInstance;
}

// 重置客户端实例（配置更改时调用）
export function resetS3Client(): void {
  s3ClientInstance = null;
} 