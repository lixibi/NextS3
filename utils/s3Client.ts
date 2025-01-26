import { S3Client } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';

let s3Client: S3Client | null = null;

export function getS3Client() {
  if (!s3Client) {
    throw new Error('S3 client not initialized');
  }
  return s3Client;
}

export function initS3Client(config: {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  region: string;
}) {
  s3Client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    forcePathStyle: true,
    maxAttempts: 3,
    requestHandler: new NodeHttpHandler({
      connectionTimeout: 5000,
      socketTimeout: 5000
    }),
    customUserAgent: 'NextS3Client/1.0',
    skipRequestingAccountId: true,
    useArnRegion: true,
    systemClockOffset: 15 * 60 * 1000
  });
  return s3Client;
}

export function resetS3Client() {
  s3Client = null;
}

export function getCurrentBucket(): string {
  // 从localStorage获取当前bucket
  return localStorage.getItem('currentBucket') || '';
} 