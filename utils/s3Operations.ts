import { ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client } from './s3Client';
import { getCurrentBucket } from './s3Client';

export interface FileType {
  Key: string;
  Size: number;
  LastModified: Date;
  IsText?: boolean;
  Preview?: string;
  ETag?: string;
}

// 添加重试逻辑的包装函数
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      if (error.name === 'RequestTimeTooSkewed') {
        // 如果是时间偏差错误，等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export async function listFiles(): Promise<FileType[]> {
  return withRetry(async () => {
    const s3Client = getS3Client();
    const command = new ListObjectsV2Command({
      Bucket: getCurrentBucket(),
    });
    
    const response = await s3Client.send(command);
    const contents = response.Contents || [];
    
    return contents.map(item => ({
      Key: item.Key || '',
      Size: item.Size || 0,
      LastModified: item.LastModified || new Date(),
      ETag: item.ETag
    }));
  });
}

// ... 其他函数保持不变 ... 