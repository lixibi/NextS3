import { S3Client } from "@aws-sdk/client-s3";

if (!process.env.NEXT_PUBLIC_S3_ENDPOINT) throw new Error('S3 endpoint not configured');
if (!process.env.NEXT_PUBLIC_S3_ACCESS_KEY) throw new Error('S3 access key not configured');
if (!process.env.NEXT_PUBLIC_S3_SECRET_KEY) throw new Error('S3 secret key not configured');
if (!process.env.NEXT_PUBLIC_S3_REGION) throw new Error('S3 region not configured');

export const s3Client = new S3Client({
  endpoint: process.env.NEXT_PUBLIC_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY,
    secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_KEY,
  },
  region: process.env.NEXT_PUBLIC_S3_REGION,
  forcePathStyle: true, // 必须为MinIO设置
}); 