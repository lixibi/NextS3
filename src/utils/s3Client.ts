import { S3Client, S3ClientConfig } from "@aws-sdk/client-s3";

// 定义必需的环境变量类型
interface RequiredEnvVars {
  NEXT_PUBLIC_S3_BUCKET: string | undefined;
  NEXT_PUBLIC_S3_ENDPOINT: string | undefined;
  NEXT_PUBLIC_S3_ACCESS_KEY: string | undefined;
  NEXT_PUBLIC_S3_SECRET_KEY: string | undefined;
  NEXT_PUBLIC_S3_REGION: string | undefined;
}

// 检查必需的环境变量
const requiredEnvVars: RequiredEnvVars = {
  NEXT_PUBLIC_S3_BUCKET: process.env.NEXT_PUBLIC_S3_BUCKET,
  NEXT_PUBLIC_S3_ENDPOINT: process.env.NEXT_PUBLIC_S3_ENDPOINT,
  NEXT_PUBLIC_S3_ACCESS_KEY: process.env.NEXT_PUBLIC_S3_ACCESS_KEY,
  NEXT_PUBLIC_S3_SECRET_KEY: process.env.NEXT_PUBLIC_S3_SECRET_KEY,
  NEXT_PUBLIC_S3_REGION: process.env.NEXT_PUBLIC_S3_REGION
};

// 统一的环境变量检查
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) throw new Error(`环境变量 ${key} 未配置`);
});

// S3 客户端配置
const s3Config: S3ClientConfig = {
  endpoint: process.env.NEXT_PUBLIC_S3_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY!,
    secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_KEY!,
  },
  region: process.env.NEXT_PUBLIC_S3_REGION!,
  forcePathStyle: true, // MinIO 必需
};

// 创建并导出 S3 客户端实例
export const s3Client = new S3Client(s3Config); 