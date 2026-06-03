import prisma from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';
import type { Annotation, AnnotationType } from '@prisma/client';
import fs from 'fs';
import path from 'path';

export interface CreateAnnotationData {
  paperId: string;
  page: number;
  rects: Array<{ x: number; y: number; width: number; height: number }>;
  selectedText?: string;
  type: AnnotationType;
  color: string;
  comment?: string;
}

export interface UpdateAnnotationData {
  type?: AnnotationType;
  color?: string;
  comment?: string;
  aiSummary?: unknown;
}

/** 本地文件兜底标注（无数据库时落到 data/annotations/*.json 的松散结构） */
interface LocalAnnotation {
  id?: string;
  [key: string]: unknown;
}

const getLocalAnnotationsDir = () => {
  const dir = path.join(process.cwd(), 'data', 'annotations');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const loadAnnotationsFromFile = (paperId: string): LocalAnnotation[] => {
  const dir = getLocalAnnotationsDir();
  const filePath = path.join(dir, `${paperId}.json`);
  
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn(`Failed to load annotations from file: ${error}`);
  }
  
  return [];
};

const saveAnnotationsToFile = (paperId: string, annotations: LocalAnnotation[]): void => {
  const dir = getLocalAnnotationsDir();
  const filePath = path.join(dir, `${paperId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(annotations, null, 2));
};

export const ANNOTATION_COLORS: Record<AnnotationType, string> = {
  highlight: '#F6E7B2',
  insight: '#CFE3FF',
  todo: '#DCCBFF',
  transferable: '#CBEFD8',
};

export async function createAnnotation(data: CreateAnnotationData): Promise<Annotation | null> {
  try {
    console.log('[Service] Creating annotation:', data);
    const annotation = await prisma.annotation.create({
      data: {
        paperId: data.paperId,
        page: data.page,
        rects: data.rects,
        selectedText: data.selectedText,
        type: data.type,
        color: data.color,
        comment: data.comment,
      },
    });
    console.log('[Service] Annotation created successfully:', annotation);
    return annotation;
  } catch (error) {
    console.warn('[Service] Database create failed, using file storage:', error);
    
    const annotations = loadAnnotationsFromFile(data.paperId);
    const newAnnotation = {
      id: `anno-${Date.now()}`,
      ...data,
      aiSummary: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    annotations.push(newAnnotation);
    saveAnnotationsToFile(data.paperId, annotations);
    console.log('[Service] Annotation saved to file:', newAnnotation);
    return newAnnotation as unknown as Annotation;
  }
}

export async function getAnnotationsByPaperId(paperId: string): Promise<Annotation[]> {
  try {
    console.log('[Service] Getting annotations for paper:', paperId);
    const annotations = await prisma.annotation.findMany({
      where: { paperId },
      orderBy: { createdAt: 'asc' },
    });
    console.log('[Service] Found annotations:', annotations.length);
    return annotations;
  } catch (error) {
    console.warn('[Service] Database read failed, using file storage:', error);
    const annotations = loadAnnotationsFromFile(paperId) as Annotation[];
    console.log('[Service] Loaded annotations from file:', annotations.length);
    return annotations;
  }
}

export async function getAnnotationById(id: string): Promise<Annotation | null> {
  try {
    return await prisma.annotation.findUnique({ where: { id } });
  } catch {
    return null;
  }
}

export async function updateAnnotation(id: string, data: UpdateAnnotationData): Promise<Annotation | null> {
  try {
    console.log('[Service] Updating annotation:', { id, data });
    const result = await prisma.annotation.update({
      where: { id },
      // aiSummary 是 JSON 列；UpdateAnnotationData.aiSummary 为 unknown，
      // 这里收敛到 Prisma 的 JSON 输入类型
      data: {
        ...data,
        aiSummary: data.aiSummary as Prisma.InputJsonValue | undefined,
        updatedAt: new Date(),
      },
    });
    console.log('[Service] Annotation updated successfully:', result);
    return result;
  } catch (error) {
    console.warn('[Service] Database update failed, trying file storage:', error);
    
    // 尝试文件存储模式 - 搜索所有标注文件（fs/path 已在模块顶部 import）
    const annotationsDir = getLocalAnnotationsDir();

    if (!fs.existsSync(annotationsDir)) {
      console.error('[Service] Annotations directory does not exist');
      return null;
    }

    const files = fs.readdirSync(annotationsDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(annotationsDir, file);
      const annotations: LocalAnnotation[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const index = annotations.findIndex((a) => a.id === id);
      
      if (index !== -1) {
        annotations[index] = {
          ...annotations[index],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        fs.writeFileSync(filePath, JSON.stringify(annotations, null, 2));
        console.log('[Service] Annotation updated in file storage:', file);
        return annotations[index] as unknown as Annotation;
      }
    }
    
    console.error('[Service] Annotation not found in file storage');
    return null;
  }
}

export async function deleteAnnotation(id: string): Promise<boolean> {
  try {
    console.log('[Service] Deleting annotation:', id);
    await prisma.annotation.delete({ where: { id } });
    console.log('[Service] Annotation deleted successfully');
    return true;
  } catch (error) {
    console.warn('[Service] Database delete failed, trying file storage:', error);
    
    // 尝试文件存储模式 - 搜索所有标注文件
    const annotationsDir = getLocalAnnotationsDir();
    
    if (!fs.existsSync(annotationsDir)) {
      console.error('[Service] Annotations directory does not exist');
      return false;
    }
    
    const files = fs.readdirSync(annotationsDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const filePath = path.join(annotationsDir, file);
      const annotations: LocalAnnotation[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const filteredAnnotations = annotations.filter((a) => a.id !== id);
      
      if (filteredAnnotations.length !== annotations.length) {
        fs.writeFileSync(filePath, JSON.stringify(filteredAnnotations, null, 2));
        console.log('[Service] Annotation deleted from file storage:', file);
        return true;
      }
    }
    
    console.error('[Service] Annotation not found in file storage');
    return false;
  }
}

export async function deleteAnnotationsByPaperId(paperId: string): Promise<boolean> {
  try {
    console.log('[Service] Deleting all annotations for paper:', paperId);
    await prisma.annotation.deleteMany({ where: { paperId } });
    console.log('[Service] All annotations deleted successfully');
    return true;
  } catch (error) {
    console.warn('[Service] Database delete failed, trying file storage:', error);
    const dir = getLocalAnnotationsDir();
    const filePath = path.join(dir, `${paperId}.json`);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('[Service] Annotations file deleted:', paperId);
        return true;
      }
    } catch (fileError) {
      console.warn(`Failed to delete annotations file: ${fileError}`);
    }
    return false;
  }
}

export function getAnnotationTypeLabel(type: AnnotationType): string {
  const labels: Record<AnnotationType, string> = {
    highlight: 'Highlight',
    insight: 'Insight',
    todo: 'Todo',
    transferable: 'Transferable',
  };
  return labels[type];
}
