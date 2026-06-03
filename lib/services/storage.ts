/**
 * Supabase Storage 服务
 * 
 * 提供 PDF 文件上传和管理功能
 */

import { createClient } from '@supabase/supabase-js';

// Supabase 客户端配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 将 PDF 文件上传到 Supabase Storage
 * 
 * @param fileBuffer PDF 文件的 Buffer
 * @param fileName 文件名（建议包含 arxivId）
 * @returns 存储路径或公开访问 URL
 */
export async function uploadPdfToStorage(fileBuffer: Buffer, fileName: string): Promise<string> {
  // 确保文件名安全，移除特殊字符
  const safeFileName = fileName
    .replace(/[^a-z0-9\._-]/gi, '_')
    .toLowerCase();
  
  // 构建存储路径
  const storagePath = `papers/${safeFileName}`;
  
  // 上传文件
  const { error } = await supabase.storage
    .from('papers')
    .upload(storagePath, fileBuffer, {
      contentType: 'application/pdf',
      upsert: false, // 不覆盖已存在的文件
    });
  
  if (error) {
    throw new Error(`Failed to upload PDF: ${error.message}`);
  }
  
  // 获取公开访问 URL
  const { data: urlData } = supabase.storage
    .from('papers')
    .getPublicUrl(storagePath);
  
  return urlData.publicUrl || storagePath;
}

/**
 * 检查文件是否已存在于 Storage
 * 
 * @param fileName 文件名
 * @returns 是否存在
 */
export async function checkFileExists(fileName: string): Promise<boolean> {
  const safeFileName = fileName
    .replace(/[^a-z0-9\._-]/gi, '_')
    .toLowerCase();
  
  const { data, error } = await supabase.storage
    .from('papers')
    .list('papers', {
      search: safeFileName,
    });
  
  if (error) {
    console.warn(`Error checking file existence: ${error.message}`);
    return false;
  }
  
  return data && data.length > 0;
}

/**
 * 删除存储中的 PDF 文件
 * 
 * @param storagePath 存储路径
 * @returns 是否删除成功
 */
export async function deletePdfFromStorage(storagePath: string): Promise<boolean> {
  const { error } = await supabase.storage
    .from('papers')
    .remove([storagePath]);
  
  if (error) {
    console.error(`Failed to delete PDF: ${error.message}`);
    return false;
  }
  
  return true;
}

/**
 * 获取存储中的文件信息
 * 
 * @param storagePath 存储路径
 * @returns 文件元数据
 */
export async function getFileInfo(storagePath: string): Promise<{
  size: number;
  lastModified: Date;
} | null> {
  const { data, error } = await supabase.storage
    .from('papers')
    .list('papers', {
      search: storagePath.split('/').pop(),
    });
  
  if (error || !data || data.length === 0) {
    return null;
  }
  
  const file = data[0] as {
    size?: number;
    metadata?: { size?: number };
    updated_at?: string;
    last_modified?: string;
  };
  return {
    size: file.size || file.metadata?.size || 0,
    lastModified: new Date(file.updated_at || file.last_modified || new Date()),
  };
}