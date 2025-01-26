'use client';

import { useState, useEffect, useRef } from 'react';
import { uploadText, uploadFile, listFiles, downloadFile, previewTextFile, deleteFile, getSignedUrl, previewImage as getPreviewImageUrl } from '@/utils/s3Operations';
import { 
  MessageSquareText,
  Image, 
  File, 
  Download, 
  X,
  Search,
  Calendar,
  Filter,
  Clock,
  Trash2,
  AlertCircle,
  FileText,      // 文本文件
  FileJson,      // JSON文件
  FileCode,      // 代码文件
  FileSpreadsheet, // 电子表格
  FileArchive,   // 压缩文件
  FileVideo,     // 视频文件
  FileAudio,     // 音频文件
  Presentation,  // 演示文稿
  FileCheck,     // Word文档
  Copy          // 添加复制图标
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface S3ResponseObject {
  Key?: string;
  Size?: number;
  LastModified: Date;
  IsText: boolean | undefined;
  Preview: string | undefined;
  ETag?: string;
  ChecksumAlgorithm?: unknown[];
  StorageClass?: string;
  Owner?: unknown;
  RestoreStatus?: unknown;
}

type FileType = {
  Key: string;
  Size: number;
  LastModified: Date;
  IsText?: boolean;
  Preview?: string;
  ETag?: string;
  StorageClass?: string;
};

// 修改 FilterType 类型
type FilterType = 'all' | 'message' | 'file' | 'media';

export default function Home() {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<FileType[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'message' | 'file' | 'media'>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    type: 'name' | 'content';
    file: {
      name: string;
      size: number;
      lastModified: Date;
    };
  } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
<<<<<<< Updated upstream
=======
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({
    endpoint: process.env.NEXT_PUBLIC_S3_ENDPOINT || '',
    accessKey: process.env.NEXT_PUBLIC_S3_ACCESS_KEY || '',
    secretKey: process.env.NEXT_PUBLIC_S3_SECRET_KEY || '',
    region: process.env.NEXT_PUBLIC_S3_REGION || '',
    bucket: process.env.NEXT_PUBLIC_S3_BUCKET || ''
  });
  const [configMode, setConfigMode] = useState<'simple' | 'advanced'>('simple');
  const [connectionCode, setConnectionCode] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
>>>>>>> Stashed changes

  // 获取文件图标
  const getFileIcon = (fileName: string) => {
    if (fileName.startsWith('text-')) {
      return <MessageSquareText className="w-5 h-5 text-blue-500" />;
    }
    
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      // 图片文件
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
      case 'svg':
      case 'bmp':
      case 'ico':
      case 'tiff':
      case 'heic': // iOS图片
      case 'raw':  // 相机原始格式
      case 'psd':  // Photoshop
      case 'ai':   // Illustrator
        return <Image className="w-5 h-5 text-green-500" />;
        
      // 文本文件
      case 'txt':
      case 'md':
      case 'markdown':
      case 'rtf':
      case 'log':
      case 'ini':
      case 'yml':
      case 'yaml':
      case 'toml':
      case 'xml':
      case 'srt':  // 字幕文件
      case 'vtt':  // 字幕文件
        return <FileText className="w-5 h-5 text-orange-500" />;
        
      // 代码文件
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
      case 'h':
      case 'hpp':
      case 'cs':   // C#
      case 'rb':   // Ruby
      case 'php':
      case 'go':
      case 'rs':   // Rust
      case 'swift':
      case 'kt':   // Kotlin
      case 'dart':
      case 'lua':
      case 'r':
      case 'sql':
      case 'sh':   // Shell
      case 'bash':
      case 'ps1':  // PowerShell
      case 'vue':
      case 'scss':
      case 'less':
      case 'html':
      case 'css':
      case 'xaml':
        return <FileCode className="w-5 h-5 text-purple-500" />;
        
      // 配置和数据文件
      case 'json':
      case 'jsonc':
      case 'geojson':
      case 'graphql':
      case 'env':
        return <FileJson className="w-5 h-5 text-yellow-500" />;
        
      // 电子表格
      case 'xlsx':
      case 'xls':
      case 'csv':
      case 'tsv':
      case 'ods':  // OpenDocument
      case 'numbers': // Apple Numbers
        return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
        
      // 压缩文件
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
      case 'bz2':
      case 'xz':
      case 'tgz':
      case 'iso':
      case 'dmg':  // macOS磁盘镜像
        return <FileArchive className="w-5 h-5 text-amber-600" />;
        
      // 视频文件
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
      case 'flv':
      case 'mkv':
      case 'webm':
      case 'm4v':
      case '3gp':
      case 'mpeg':
      case 'mpg':
      case 'ts':   // 视频流
      case 'f4v':
      case 'vob':  // DVD
      case 'ogv':
        return <FileVideo className="w-5 h-5 text-blue-600" />;
        
      // 音频文件
      case 'mp3':
      case 'wav':
      case 'ogg':
      case 'm4a':
      case 'flac':
      case 'aac':
      case 'wma':
      case 'aiff':
      case 'alac': // Apple无损
      case 'mid':
      case 'midi':
      case 'opus':
      case 'amr':  // 手机录音
        return <FileAudio className="w-5 h-5 text-pink-500" />;
        
      // 演示文稿
      case 'ppt':
      case 'pptx':
      case 'key':  // Apple Keynote
      case 'odp':  // OpenDocument
      case 'pps':
      case 'ppsx':
        return <Presentation className="w-5 h-5 text-red-500" />;
        
      // Word文档
      case 'doc':
      case 'docx':
      case 'pages': // Apple Pages
      case 'odt':   // OpenDocument
      case 'rtf':
      case 'tex':   // LaTeX
      case 'wpd':   // WordPerfect
        return <FileCheck className="w-5 h-5 text-blue-700" />;
        
      // 字体文件
      case 'ttf':
      case 'otf':
      case 'woff':
      case 'woff2':
      case 'eot':
        return <File className="w-5 h-5 text-violet-500" />;
        
      // 3D和CAD文件
      case 'obj':
      case 'fbx':
      case 'stl':
      case 'dxf':
      case '3ds':
      case 'blend': // Blender
      case 'max':   // 3ds Max
      case 'mb':    // Maya
      case 'skp':   // SketchUp
        return <File className="w-5 h-5 text-cyan-500" />;
        
      // 其他文件
      default:
        return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  // 获取文件预览标题
  const getFilePreviewTitle = (fileName: string) => {
    if (fileName.startsWith('text-')) {
      const match = fileName.match(/text-(.*)-\d+\.txt$/);
      return match ? match[1] : '文本消息';
    }
    return fileName;
  };

  // 添加文件类型分组函数
  const getFileType = (fileName: string): string => {
    if (fileName.startsWith('text-')) return '文本消息';
    
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
      case 'svg':
        return '图片';
      case 'txt':
      case 'md':
      case 'markdown':
        return '文本';
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
      case 'html':
      case 'css':
      case 'php':
        return '代码';
      case 'json':
        return 'JSON';
      case 'xlsx':
      case 'xls':
      case 'csv':
        return '电子表格';
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
        return '压缩包';
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
      case 'flv':
      case 'mkv':
        return '视频';
      case 'mp3':
      case 'wav':
      case 'ogg':
      case 'm4a':
      case 'flac':
        return '音频';
      case 'ppt':
      case 'pptx':
        return '演示文稿';
      case 'doc':
      case 'docx':
      case 'rtf':
        return 'Word文档';
      case 'ttf':
      case 'otf':
      case 'woff':
      case 'woff2':
      case 'eot':
        return '字体';
      case 'obj':
      case 'fbx':
      case 'stl':
      case 'dxf':
      case '3ds':
      case 'blend':
      case 'max':
      case 'mb':
      case 'skp':
        return '3D/CAD';
      default:
        return '其他';
    }
  };

  // 添加获取相对日期的函数
  const getRelativeDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);

    // 重置时间部分，只比较日期
    const compareDate = new Date(date);
    [today, yesterday, twoDaysAgo, compareDate].forEach(d => {
      d.setHours(0, 0, 0, 0);
    });

    if (compareDate.getTime() === today.getTime()) {
      return '今天';
    } else if (compareDate.getTime() === yesterday.getTime()) {
      return '昨天';
    } else if (compareDate.getTime() === twoDaysAgo.getTime()) {
      return '前天';
    } else {
      return format(date, 'MM-dd', { locale: zhCN });
    }
  };

  // 修改 groupFilesByDate 函数
  const groupFilesByDate = (files: FileType[]) => {
    const filtered = files.filter(file => {
      const searchLower = searchTerm.toLowerCase();
      const keyLower = file.Key.toLowerCase();
      
      const matchesSearch = keyLower.includes(searchLower) || 
        (file.Preview && file.Preview.toLowerCase().includes(searchLower));

      const matchesType = filterType === 'all' 
        ? true 
        : filterType === 'message' 
          ? file.Key.startsWith('text-') 
          : filterType === 'media'
            ? file.Key.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|mp4|avi|mov|mp3|wav)$/i)
            : !file.Key.startsWith('text-') && !file.Key.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|mp4|avi|mov|mp3|wav)$/i);

      return matchesSearch && matchesType;
    });

    // 按日期降序排序文件
    filtered.sort((a, b) => b.LastModified.getTime() - a.LastModified.getTime());

    return filtered.reduce((groups: Record<string, FileType[]>, file) => {
      const date = getRelativeDate(new Date(file.LastModified));
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(file);
      return groups;
    }, {});
  };

  // 添加自动刷新机制
  useEffect(() => {
    refreshFiles();
    
    // 设置定期刷新
    const refreshInterval = setInterval(() => {
      refreshFiles();
    }, 5000); // 每5秒刷新一次
    
    return () => clearInterval(refreshInterval);
  }, []);

  const refreshFiles = async () => {
    try {
      const response = await listFiles();
      if (response.Contents) {
        const validFiles = response.Contents
          .filter(item => item.Key && item.Size && item.LastModified)
          .map(item => ({
            Key: item.Key as string,
            Size: item.Size as number,
            LastModified: item.LastModified as Date,
            IsText: item.IsText,
            Preview: item.Preview,
            ETag: item.ETag,
            StorageClass: item.StorageClass
          }));
        setFiles(validFiles);
      }
    } catch (error) {
      console.error('Error listing files:', error);
      showToast('刷新列表失败');
    }
  };

  const handleTextSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      await uploadText(text);
      setText('');
      await refreshFiles(); // 等待刷新完成
      showToast('发送成功');
    } catch (error) {
      console.error('Error uploading text:', error);
      showToast('发送失败');
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      await uploadFile(file, false, (progress) => {
        setUploadProgress(progress);
      });
      await refreshFiles(); // 等待刷新完成
      showToast('上传成功');
      e.target.value = '';
    } catch (error: any) {
      if (error.code === 'FILE_EXISTS') {
        setDuplicateInfo({
          type: 'name',
          file: error.existingFile
        });
        setFileToUpload(file);
        setShowOverwriteConfirm(true);
      } else {
        console.error('Error uploading file:', error);
        showToast('上传失败');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handlePreview = async (key: string) => {
    if (!key.startsWith('text-')) return;
    
    try {
      setLoading(true);
      const text = await previewTextFile(key);
      setSelectedText(text || '无法加载内容');
      setShowPreview(true);
    } catch (error) {
      console.error('Error previewing text:', error);
      // 显示错误消息给用户
      setSelectedText('无法加载文件内容');
      setShowPreview(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (key: string) => {
    try {
      if (key.startsWith('text-')) {
        await deleteFile(key);
        await refreshFiles(); // 等待刷新完成
        showToast('删除成功');
      } else {
        setFileToDelete(key);
        setShowDeleteConfirm(true);
      }
    } catch (error: any) {
      console.error('Error deleting file:', error);
      showToast(error.message || '删除失败');
    }
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    
    try {
      await deleteFile(fileToDelete);
      await refreshFiles(); // 等待刷新完成
      showToast('删除成功');
      setShowDeleteConfirm(false);
      setFileToDelete(null);
    } catch (error: any) {
      console.error('Error deleting file:', error);
      showToast(error.message || '删除失败');
    }
  };

  // 修改筛选逻辑
  const matchesType = (file: FileType) => {
    if (filterType === 'all') return true;
    
    const type = getFileType(file.Key);
    switch (filterType) {
      case 'message':
        return file.Key.startsWith('text-');
      case 'media':
        return ['图片', '视频', '音频'].includes(type);
      case 'file':
        return !file.Key.startsWith('text-') && !['图片', '视频', '音频'].includes(type);
      default:
        return false;
    }
  };

  // 修改确认覆盖函数
  const confirmOverwrite = async () => {
    if (!fileToUpload) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      await uploadFile(fileToUpload, true, (progress) => {
        setUploadProgress(progress);
      });
      await refreshFiles(); // 等待刷新完成
      showToast('文件已覆盖');
      setShowOverwriteConfirm(false);
      setFileToUpload(null);
    } catch (error) {
      console.error('Error uploading file:', error);
      showToast('覆盖失败');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // 显示提示
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => {
      setToast(null);
    }, 2000);
  };

  // 修改复制函数
  const copyToClipboard = async (text: string) => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        // 降级方案：使用传统的复制方法
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      } else {
        await navigator.clipboard.writeText(text);
      }
      showToast('复制成功');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      showToast('复制失败');
    }
  };

  // 处理拖拽
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      if (fileInputRef.current) {
        fileInputRef.current.files = e.dataTransfer.files;
        handleFileUpload({ target: { files: e.dataTransfer.files } } as any);
      }
    }
  };

  // 修改搜索逻辑
  const matchesSearch = (file: FileType) => {
    const searchLower = searchTerm.toLowerCase();
    const keyLower = file.Key.toLowerCase();
    
    // 检查文件名
    if (keyLower.includes(searchLower)) {
      return true;
    }
    
    // 检查文本内容
    if (file.Preview && file.Preview.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    return false;
  };

  // 处理文件点击
  const handleFileClick = async (file: FileType) => {
    const ext = file.Key.split('.').pop()?.toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    
    if (file.Key.startsWith('text-')) {
      handlePreview(file.Key);
    } else if (ext && imageExts.includes(ext)) {
      try {
        const url = await getPreviewImageUrl(file.Key);
        setPreviewImageUrl(url);
      } catch (error) {
        console.error('Error previewing image:', error);
      }
    }
  };

  // 清理预览图片 URL
  const clearPreviewImage = () => {
    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl);
      setPreviewImageUrl(null);
    }
  };

  // 在组件卸载时清理 URL
  useEffect(() => {
    return () => {
      clearPreviewImage();
    };
  }, []);

  const handleDownload = async (key: string) => {
    try {
      await downloadFile(key);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      showToast(error.message || '下载失败');
    }
  };

  return (
    <main className="min-h-screen p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      {/* 标题区域 */}
      <div className="relative mb-8">
        <div className="p-4">
          <div className="flex flex-col items-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">多人文件助手</h1>
            <div className="flex items-center justify-between w-full relative">
              <div className="absolute inset-x-0 text-center">
                <p className="text-sm text-gray-500">multfilehelper by hebeos</p>
              </div>
              <div className="ml-auto z-10">
                <a href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-200">
                  登录
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 文本输入区域 */}
      <div className="card p-4 mb-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="输入要上传的文本..."
          className="input min-h-[100px] mb-4 resize-none"
        />
        <div className="flex justify-end">
          <button
            onClick={handleTextSubmit}
            disabled={!text.trim() || loading}
            className={`btn bg-gray-900 hover:bg-gray-800 text-white flex items-center gap-2 ${
              (!text.trim() || loading) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <MessageSquareText className="w-5 h-5" />
            {loading ? '发送中...' : '发送消息'}
          </button>
        </div>
      </div>

      {/* 文件上传区域 */}
      <div 
        className={`card p-4 mb-6 relative ${
          isDragging ? 'border-primary border-2 bg-primary/5' : ''
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted flex-1 text-center">
            {!fileToUpload && "或将文件拖放到此处"}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            id="fileInput"
          />
          <label
            htmlFor="fileInput"
            className="btn bg-gray-900 hover:bg-gray-800 text-white flex items-center gap-2 cursor-pointer"
          >
            <File className="w-5 h-5" />
            选择文件
          </label>
        </div>
        {isUploading && (
          <div className="mt-4">
            <div className="h-2 bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-muted mt-2 text-center">
              上传进度: {uploadProgress}%
            </p>
          </div>
        )}
        {isDragging && (
          <div className="absolute inset-0 bg-primary/5 flex items-center justify-center rounded-lg border-2 border-primary border-dashed">
            <p className="text-primary font-medium">释放鼠标上传文件</p>
          </div>
        )}
      </div>

      {/* 文件列表区域 */}
      <div className="card">
        {/* 搜索和筛选工具栏 */}
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索文件..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted w-5 h-5" />
              </div>
            </div>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => setFilterType('all')}
                className={`btn ${filterType === 'all' ? 'bg-gray-900 text-white' : 'border border-gray-200'} hover:bg-gray-800 hover:text-white flex items-center gap-2`}
              >
                <Filter className="w-4 h-4" />
              </button>
              <button
                onClick={() => setFilterType('message')}
                className={`btn ${filterType === 'message' ? 'bg-gray-900 text-white' : 'border border-gray-200'} hover:bg-gray-800 hover:text-white flex items-center gap-2`}
              >
                <MessageSquareText className="w-4 h-4" />
              </button>
              <button
                onClick={() => setFilterType('media')}
                className={`btn ${filterType === 'media' ? 'bg-gray-900 text-white' : 'border border-gray-200'} hover:bg-gray-800 hover:text-white flex items-center gap-2`}
              >
                <Image className="w-4 h-4" />
              </button>
              <button
                onClick={() => setFilterType('file')}
                className={`btn ${filterType === 'file' ? 'bg-gray-900 text-white' : 'border border-gray-200'} hover:bg-gray-800 hover:text-white flex items-center gap-2`}
              >
                <File className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 文件列表内容 */}
        <div className="p-4 space-y-6">
          {Object.entries(groupFilesByDate(files.filter(file => {
            const searchLower = searchTerm.toLowerCase();
            const keyLower = file.Key.toLowerCase();
            
            // 搜索匹配：文件名或文本内容
            const matchesSearch = keyLower.includes(searchLower) || 
              (file.Preview && file.Preview.toLowerCase().includes(searchLower));

            return matchesSearch && matchesType(file);
          }))).map(([date, groupFiles]) => (
            <div key={date} className="space-y-3">
              <h2 className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium text-gray-900">
                <Calendar className="w-4 h-4" />
                {date}
              </h2>
              <div className="space-y-2">
                {groupFiles.map((file) => (
                  <div
                    key={file.Key}
                    className={`file-item ${(file.Key.startsWith('text-') || file.Key.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i)) ? 'hover-scale cursor-pointer' : ''}`}
                    onClick={() => handleFileClick(file)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="file-icon">
                        {getFileIcon(file.Key)}
                      </div>
                      <div className="flex-1 min-w-0">
                        {file.Key.startsWith('text-') ? (
                          <>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-card-foreground">文本消息</p>
                              <span className="text-sm text-muted">
                                {format(new Date(file.LastModified), 'HH:mm', { locale: zhCN })}
                              </span>
                            </div>
                            <p className="text-foreground/80 mt-1 line-clamp-2 text-sm">
                              {file.Preview || '加载中...'}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-card-foreground truncate">
                              {getFilePreviewTitle(file.Key)}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-muted">
                                {(file.Size / 1024).toFixed(2)} KB
                              </span>
                              <span className="text-border">•</span>
                              <span className="text-sm text-muted">
                                {format(new Date(file.LastModified), 'HH:mm', { locale: zhCN })}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.Key.startsWith('text-') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(file.Preview || '');
                          }}
                          className="icon-btn hover:text-gray-900"
                          title="复制"
                        >
                          <Copy className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file.Key);
                        }}
                        className="icon-btn hover:text-gray-900"
                        title="下载"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(file.Key);
                        }}
                        className="icon-btn hover:text-red-600"
                        title="删除"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 预览模态框 */}
      {showPreview && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <MessageSquareText className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">文本消息</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(selectedText)}
                  className="icon-btn hover:text-gray-900"
                  title="复制"
                >
                  <Copy className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="icon-btn"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto max-h-[60vh]">
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {selectedText}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认模态框 */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <h3 className="text-lg font-semibold">确认删除</h3>
              </div>
              <p className="text-muted mb-6">
                确定要删除这个文件吗？此操作无法撤销。
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn border border-gray-200 hover:bg-gray-100 text-gray-700"
                >
                  取消
                </button>
                <button
                  onClick={confirmDelete}
                  className="btn bg-gray-900 hover:bg-gray-800 text-white"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 覆盖确认模态框 */}
      {showOverwriteConfirm && duplicateInfo && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-yellow-500" />
                <h3 className="text-lg font-semibold">文件已存在</h3>
              </div>
              <p className="text-muted mb-4">
                {duplicateInfo.type === 'name' 
                  ? '存在同名文件，是否覆盖？'
                  : '存在相同内容的文件，是否继续上传？'
                }
              </p>
              <div className="bg-background/50 rounded-lg p-3 mb-6">
                <p className="text-sm font-medium mb-2">现有文件信息：</p>
                <p className="text-sm text-muted">
                  名称：{duplicateInfo.file.name}
                </p>
                <p className="text-sm text-muted">
                  大小：{(duplicateInfo.file.size / 1024).toFixed(2)} KB
                </p>
                <p className="text-sm text-muted">
                  修改时间：{format(duplicateInfo.file.lastModified, 'yyyy-MM-dd HH:mm:ss')}
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowOverwriteConfirm(false)}
                  className="btn border border-gray-200 hover:bg-gray-100 text-gray-700"
                >
                  取消
                </button>
                <button
                  onClick={confirmOverwrite}
                  className="btn bg-gray-900 hover:bg-gray-800 text-white"
                >
                  确认覆盖
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 浮动提示 */}
      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}

      {/* 图片预览模态框 */}
      {previewImageUrl && (
        <div className="modal-overlay" onClick={clearPreviewImage}>
          <div className="modal-content max-w-4xl p-0" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold">图片预览</h3>
              <button
                onClick={clearPreviewImage}
                className="icon-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative aspect-video bg-background/50">
              <img
                src={previewImageUrl}
                alt="预览图片"
                className="absolute inset-0 w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
<<<<<<< Updated upstream
=======

      {/* 配置模态框 */}
      {showConfig && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">系统配置</h3>
              </div>
              <button
                onClick={() => setShowConfig(false)}
                className="icon-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 配置模式切换 */}
            <div className="p-4 border-b border-border">
              <div className="flex gap-2">
                <button
                  onClick={() => setConfigMode('simple')}
                  className={`btn flex-1 ${configMode === 'simple' ? 'bg-gray-900 text-white' : 'border border-gray-200'}`}
                >
                  简易模式
                </button>
                <button
                  onClick={() => setConfigMode('advanced')}
                  className={`btn flex-1 ${configMode === 'advanced' ? 'bg-gray-900 text-white' : 'border border-gray-200'}`}
                >
                  高级模式
                </button>
              </div>
            </div>

            {configMode === 'simple' ? (
              // 简易模式
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">连接码</label>
                  <input
                    type="text"
                    value={connectionCode}
                    onChange={(e) => setConnectionCode(e.target.value)}
                    className="input"
                    placeholder="请输入连接码"
                  />
                </div>
                <div className="text-sm text-gray-500">
                  <p>没有连接码？</p>
                  <a 
                    href="" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    点击这里查看连接码教程
                  </a>
                </div>
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="btn bg-gray-900 hover:bg-gray-800 text-white w-full"
                >
                  {isConnecting ? '连接中...' : '连接'}
                </button>
              </div>
            ) : (
              // 高级模式
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">MinIO 端点</label>
                  <input
                    type="text"
                    value={config.endpoint}
                    onChange={(e) => setConfig(prev => ({ ...prev, endpoint: e.target.value }))}
                    className="input"
                    placeholder="例如: http://s3.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Access Key</label>
                  <input
                    type="text"
                    value={config.accessKey}
                    onChange={(e) => setConfig(prev => ({ ...prev, accessKey: e.target.value }))}
                    className="input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Secret Key</label>
                  <input
                    type="password"
                    value={config.secretKey}
                    onChange={(e) => setConfig(prev => ({ ...prev, secretKey: e.target.value }))}
                    className="input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">区域</label>
                  <input
                    type="text"
                    value={config.region}
                    onChange={(e) => setConfig(prev => ({ ...prev, region: e.target.value }))}
                    className="input"
                    placeholder="例如: us-east-1"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">存储桶</label>
                  <input
                    type="text"
                    value={config.bucket}
                    onChange={(e) => setConfig(prev => ({ ...prev, bucket: e.target.value }))}
                    className="input"
                  />
                </div>
                <div className="pt-4 border-t border-border space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">当前连接码</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={connectionCode || '尚未生成连接码'}
                        readOnly
                        className="input bg-gray-50 flex-1"
                      />
                      <button
                        onClick={() => {
                          if (connectionCode) {
                            navigator.clipboard.writeText(connectionCode);
                            showToast('已复制连接码');
                          }
                        }}
                        className="btn border border-gray-200 hover:bg-gray-100"
                        disabled={!connectionCode}
                        title="复制连接码"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      {connectionCode ? '可以复制此连接码分享给其他用户' : '点击下方按钮生成连接码'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">生成新连接码</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        将当前配置生成链接码，方便分享给其他用户
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          // 验证所有必填字段
                          if (!config.endpoint || !config.accessKey || !config.secretKey || !config.region || !config.bucket) {
                            showToast('请填写所有配置项');
                            return;
                          }

                          const response = await fetch('http://127.0.0.1:8000/api/temp-codes', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              config_json: JSON.stringify({
                                endpoint: config.endpoint,
                                accessKey: config.accessKey,
                                secretKey: config.secretKey,
                                region: config.region,
                                bucket: config.bucket
                              })
                            })
                          });

                          const data = await response.json();

                          if (!response.ok) {
                            throw new Error(data.detail || '生成链接码失败');
                          }

                          // 更新显示的连接码
                          setConnectionCode(data.code);
                          
                          // 复制到剪贴板
                          await navigator.clipboard.writeText(data.code);
                          
                          // 显示提示
                          if (data.status === 'existing') {
                            showToast('已复制已存在的链接码：' + data.code);
                          } else {
                            showToast('已生成并复制新链接码：' + data.code);
                          }
                        } catch (error: any) {
                          console.error('生成链接码失败:', error);
                          showToast(error.message || '生成链接码失败');
                        }
                      }}
                      className="btn bg-primary hover:bg-primary/90 text-white"
                    >
                      生成链接码
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 p-4 border-t border-border">
              <button
                onClick={() => setShowConfig(false)}
                className="btn border border-gray-200 hover:bg-gray-100"
              >
                取消
              </button>
              {configMode === 'advanced' && (
                <button
                  onClick={saveConfig}
                  className="btn bg-gray-900 hover:bg-gray-800 text-white"
                >
                  保存配置
                </button>
              )}
            </div>
          </div>
        </div>
      )}
>>>>>>> Stashed changes
    </main>
  );
}
