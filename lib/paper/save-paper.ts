import { prisma } from '@/lib/db/prisma';
import type { Paper } from '@prisma/client';


export interface SavePaperOptions {
  title: string;
  abstract?: string;
  authors: Array<{ name: string; affiliation?: string }>;
  sourceType: 'ARXIV' | 'LOCAL' | 'DOI';
  sourceUrl?: string;
  arxivId?: string;
  pdfPath?: string;
  publishedAt?: Date;
  tags?: string[];
  direction?: string;
  summary?: string;
  methodology?: string;
  contribution?: string;
  notes?: string;
}

export interface SavePaperResult {
  success: boolean;
  message: string;
  paper?: Paper;
  isDuplicate?: boolean;
}

export async function checkArxivIdExists(arxivId: string): Promise<boolean> {
  const existing = await prisma.paper.findUnique({
    where: { arxivId },
  });
  
  return !!existing;
}

export async function getDuplicatePaper(arxivId: string): Promise<Paper | null> {
  return prisma.paper.findUnique({
    where: { arxivId },
  });
}

export async function savePaper(data: SavePaperOptions): Promise<SavePaperResult> {
  if (data.arxivId) {
    const exists = await checkArxivIdExists(data.arxivId);
    if (exists) {
      const existingPaper = await getDuplicatePaper(data.arxivId);
      
      return {
        success: false,
        message: '该论文已存在于论文库中',
        isDuplicate: true,
        paper: existingPaper || undefined,
      };
    }
  }
  
  try {
    const paper = await prisma.paper.create({
      data: {
        title: data.title.substring(0, 500),
        abstract: data.abstract,
        authors: JSON.parse(JSON.stringify(data.authors)),
        sourceType: data.sourceType,
        sourceUrl: data.sourceUrl,
        arxivId: data.arxivId,
        pdfPath: data.pdfPath,
        publishedAt: data.publishedAt,
        tags: data.tags ? JSON.parse(JSON.stringify(data.tags)) : [],
        direction: data.direction,
        notes: data.notes,
        summary: data.summary,
        methodology: data.methodology,
        contribution: data.contribution,
      },
    });
    
    return {
      success: true,
      message: '论文保存成功',
      paper,
    };
  } catch (error) {
    console.error('Failed to save paper:', error);
    
    return {
      success: false,
      message: `保存失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

export async function updatePaper(id: string, data: Partial<SavePaperOptions>): Promise<Paper | null> {
  try {
    return prisma.paper.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title.substring(0, 500) }),
        ...(data.abstract && { abstract: data.abstract }),
        ...(data.authors && { authors: JSON.parse(JSON.stringify(data.authors)) }),
        ...(data.sourceType && { sourceType: data.sourceType }),
        ...(data.sourceUrl && { sourceUrl: data.sourceUrl }),
        ...(data.pdfPath && { pdfPath: data.pdfPath }),
        ...(data.publishedAt && { publishedAt: data.publishedAt }),
        ...(data.tags && { tags: JSON.parse(JSON.stringify(data.tags)) }),
        ...(data.direction && { direction: data.direction }),
        ...(data.notes && { notes: data.notes }),
        ...(data.summary && { summary: data.summary }),
        ...(data.methodology && { methodology: data.methodology }),
        ...(data.contribution && { contribution: data.contribution }),
      },
    });
  } catch (error) {
    console.error('Failed to update paper:', error);
    return null;
  }
}

export async function deletePaper(id: string): Promise<boolean> {
  try {
    await prisma.paper.delete({
      where: { id },
    });
    return true;
  } catch (error) {
    console.error('Failed to delete paper:', error);
    return false;
  }
}

export async function getPapers(filters: {
  tags?: string[];
  direction?: string;
  sourceType?: 'ARXIV' | 'LOCAL' | 'DOI';
  sortBy?: 'createdAt' | 'publishedAt';
  sortOrder?: 'asc' | 'desc';
} = {}): Promise<Paper[]> {
  const { tags, direction, sourceType, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
  
  let papers = await prisma.paper.findMany({
    where: {
      ...(direction && { direction }),
      ...(sourceType && { sourceType }),
    },
    orderBy: {
      [sortBy]: sortOrder,
    },
  });
  
  if (tags && tags.length > 0) {
    papers = papers.filter(paper => {
      const paperTags = paper.tags as string[] || [];
      return tags.some(tag => paperTags.includes(tag));
    });
  }
  
  return papers;
}

export async function getPaperById(id: string): Promise<Paper | null> {
  return prisma.paper.findUnique({
    where: { id },
  });
}