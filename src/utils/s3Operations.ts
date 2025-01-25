import { PutObjectCommand, GetObjectCommand, ListObjectsCommand, DeleteObjectCommand, GetObjectCommandInput } from "@aws-sdk/client-s3";
import { getSignedUrl as s3GetSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "./s3Client";
import { S3Client, ServiceInputTypes, ServiceOutputTypes } from "@aws-sdk/client-s3";

if (!process.env.NEXT_PUBLIC_S3_BUCKET) throw new Error('S3 bucket not configured');
const BUCKET_NAME = process.env.NEXT_PUBLIC_S3_BUCKET;

export const uploadText = async (text: string) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: `text-${Date.now()}.txt`, // 简化文件名
    Body: text,
  });
  
  return await s3Client.send(command);
};

// 添加计算文件哈希值的函数
async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// 添加类型定义
type FileMetadata = {
  etag: string;
  name: string;
  size: number;
  type: string;
  lastModified: Date;
};

// 添加上传进度回调类型
type ProgressCallback = (progress: number) => void;

// 修改上传文件函数
export const uploadFile = async (
  file: File, 
  forceOverwrite = false,
  onProgress?: ProgressCallback
) => {
  try {
    if (!forceOverwrite) {
      // 检查文件是否存在
      const listCommand = new ListObjectsCommand({
        Bucket: BUCKET_NAME,
      });
      
      const response = await s3Client.send(listCommand);
      const contents = response.Contents || [];
      
      // 只检查文件名是否存在
      const existingFile = contents.find(item => item.Key === file.name);
      if (existingFile) {
        throw {
          code: 'FILE_EXISTS',
          existingFile: {
            name: existingFile.Key,
            size: existingFile.Size,
            lastModified: new Date(existingFile.LastModified || ''),
          }
        };
      }
    }

    // 获取预签名URL
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: file.name,
      ContentType: file.type,
    });

    const presignedUrl = await s3GetSignedUrl(s3Client, command, { expiresIn: 3600 });

    // 使用 XMLHttpRequest 上传文件
    return new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date()
          });
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during upload'));
      };
      
      xhr.open('PUT', presignedUrl, true);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  } catch (error) {
    if ((error as any).code === 'FILE_EXISTS') {
      throw error;
    }
    console.error('Error uploading file:', error);
    throw error;
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
    const blob = await response.Body?.transformToByteArray();
    if (!blob) throw new Error('下载失败');
    
    // 创建下载链接
    const url = URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    link.download = key;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('下载文件时出错:', error);
    throw error;
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
    await s3Client.send(command);
  } catch (error) {
    console.error('删除文件时出错:', error);
    throw error;
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

// 将 getSignedUrl 改为导出函数
export const getSignedUrl = async (command: any) => {
  try {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });

    // 使用类型断言来解决类型不匹配的问题
    const presignedUrl = await s3GetSignedUrl(s3Client as any, command, { expiresIn: 3600 });
    return presignedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
}; 