import { PutObjectCommand, GetObjectCommand, ListObjectsCommand, DeleteObjectCommand, GetObjectCommandInput } from "@aws-sdk/client-s3";
import { getSignedUrl as s3GetSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "./s3Client";
import { S3Client, ServiceInputTypes, ServiceOutputTypes } from "@aws-sdk/client-s3";
import { format } from "date-fns";

// 使用 s3Client.ts 中已经验证过的环境变量
const BUCKET_NAME = process.env.NEXT_PUBLIC_S3_BUCKET!;

// 类型定义
interface FileMetadata {
  etag: string;
  name: string;
  size: number;
  type: string;
  lastModified: Date;
}

interface S3Error extends Error {
  name: string;
  code?: string;
}

type ProgressCallback = (progress: number) => void;

// 文件上传错误类型
interface FileExistsError {
  code: 'FILE_EXISTS';
  existingFile: {
    name: string;
    size: number;
    lastModified: Date;
  };
}

// 工具函数
async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 导出函数
export const uploadText = async (text: string): Promise<void> => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: `text-${Date.now()}.txt`,
    Body: text,
  });
  
  await s3Client.send(command);
};

export const uploadFile = async (
  file: File, 
  forceOverwrite = false,
  onProgress?: ProgressCallback
): Promise<FileMetadata> => {
  try {
    if (!forceOverwrite) {
      const listCommand = new ListObjectsCommand({
        Bucket: BUCKET_NAME,
      });
      
      const response = await s3Client.send(listCommand);
      const existingFile = response.Contents?.find(item => item.Key === file.name);
      
      if (existingFile) {
        const error: FileExistsError = {
          code: 'FILE_EXISTS',
          existingFile: {
            name: existingFile.Key!,
            size: existingFile.Size!,
            lastModified: new Date(existingFile.LastModified!),
          }
        };
        throw error;
      }
    }

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: file.name,
      ContentType: file.type,
    });

    const presignedUrl = await s3GetSignedUrl(s3Client, command, { 
      expiresIn: 3600 
    });

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            etag: xhr.getResponseHeader('ETag') || '',
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date()
          });
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      
      xhr.open('PUT', presignedUrl, true);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  } catch (error) {
    if ((error as FileExistsError).code === 'FILE_EXISTS') {
      throw error;
    }
    console.error('Error uploading file:', error);
    throw new Error('文件上传失败');
  }
};

// 计算文件的ETag（模拟S3的ETag计算方式）
async function calculateFileETag(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('MD5', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `"${hashHex}"`; // S3的ETag带有引号
}

export const listFiles = async () => {
  const command = new ListObjectsCommand({
    Bucket: BUCKET_NAME,
  });
  
  const response = await s3Client.send(command);
  const contents = response.Contents || [];
  
  // 获取所有文本文件的内容
  const filesWithContent = await Promise.all(
    contents.map(async (file) => {
      const result = {
        ...file,
        LastModified: new Date(file.LastModified || ''),
        IsText: file.Key?.startsWith('text-'),
        Preview: undefined as string | undefined
      };

      if (file.Key?.startsWith('text-')) {
        try {
          const text = await previewTextFile(file.Key);
          result.Preview = text.slice(0, 50); // 只取前50个字符作为预览
        } catch (error) {
          // 如果文件不存在或读取失败，设置一个默认预览文本
          result.Preview = '无法加载预览';
          // 不抛出错误，继续处理其他文件
        }
      }

      return result;
    })
  ).catch(error => {
    console.error('Error processing files:', error);
    return []; // 如果出错返回空数组
  });

  return {
    ...response,
    Contents: filesWithContent
  };
};

// 下载文件
export const downloadFile = async (key: string) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  try {
    const response = await s3Client.send(command);
    if (!response.Body) {
      throw new Error('文件内容为空');
    }
    
    const blob = await response.Body.transformToByteArray();
    let downloadUrl: string;
    let filename: string;

    if (key.startsWith('text-')) {
      // 文本消息特殊处理
      const text = new TextDecoder('utf-8').decode(blob);
      const textBlob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      downloadUrl = URL.createObjectURL(textBlob);
      filename = `消息_${format(new Date(), 'yyyyMMdd_HHmmss')}.txt`;
    } else {
      // 其他文件正常处理
      downloadUrl = URL.createObjectURL(new Blob([blob]));
      filename = key;
    }
    
    // 创建下载链接
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  } catch (error: any) {
    console.error('下载文件时出错:', error);
    if (error.name === 'NoSuchKey') {
      throw new Error('文件不存在或已被删除');
    }
    throw new Error('下载失败，请重试');
  }
};

// 预览图片
export const previewImage = async (key: string): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  try {
    const response = await s3Client.send(command);
    const blob = await response.Body?.transformToByteArray();
    if (!blob) throw new Error('获取图片失败');
    
    // 创建预览 URL
    return URL.createObjectURL(new Blob([blob], { type: 'image/jpeg' }));
  } catch (error) {
    console.error('预览图片时出错:', error);
    throw error;
  }
};

// 新增预览文本文件功能
export const previewTextFile = async (key: string) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  try {
    const response = await s3Client.send(command);
    if (!response.Body) {
      throw new Error('文件内容为空');
    }
    const blob = await response.Body.transformToByteArray();
    const text = new TextDecoder().decode(blob);
    return text;
  } catch (error) {
    if ((error as any).name === 'NoSuchKey') {
      throw new Error('文件不存在');
    }
    throw error;
  }
};

// 修改文本预览处理
export const handlePreview = async (key: string) => {
  try {
    const text = await previewTextFile(key);
    return text;
  } catch (error) {
    console.error('Error previewing file:', error);
    return '无法加载文件内容';
  }
};

// 添加删除文件功能
export const deleteFile = async (key: string) => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  try {
    // 先检查文件是否存在
    const checkCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    try {
      await s3Client.send(checkCommand);
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        throw new Error('文件不存在或已被删除');
      }
      throw error;
    }
    
    // 文件存在，执行删除
    await s3Client.send(command);
  } catch (error: any) {
    console.error('删除文件时出错:', error);
    if (error.message === '文件不存在或已被删除') {
      throw error;
    }
    throw new Error('删除失败，请重试');
  }
};

// 添加检查文件是否存在的函数
export const checkFileExists = async (key: string) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  try {
    await s3Client.send(command);
    return true;
  } catch (error) {
    if ((error as any).name === 'NoSuchKey') {
      return false;
    }
    throw error;
  }
};

// 修改 getSignedUrl 函数，使用统一的 s3Client
export const getSignedUrl = async (command: GetObjectCommand): Promise<string> => {
  try {
    return await s3GetSignedUrl(s3Client, command, { 
      expiresIn: 3600 
    });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error('无法生成签名 URL');
  }
}; 