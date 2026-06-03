import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import fs from 'fs';
import path from 'path';

const getLocalPapersDir = () => {
  const dir = path.join(process.cwd(), 'data', 'papers');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const loadPaperFromFile = (id: string): any | null => {
  const dir = getLocalPapersDir();
  const filePath = path.join(dir, `${id}.json`);
  
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn(`Failed to load paper from file: ${error}`);
  }
  
  return null;
};

const loadPapersFromFiles = (): any[] => {
  const dir = getLocalPapersDir();
  const papers: any[] = [];
  
  try {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const filePath = path.join(dir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        papers.push(JSON.parse(content));
      }
    });
  } catch (error) {
    console.warn(`Failed to load papers from files: ${error}`);
  }
  
  return papers;
};

const deletePaperFile = (id: string): boolean => {
  const dir = getLocalPapersDir();
  const filePath = path.join(dir, `${id}.json`);
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {
    console.warn(`Failed to delete paper file: ${error}`);
  }
  
  return false;
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    let paper = null;
    
    try {
      paper = await prisma.paper.findUnique({
        where: { id }
      });
    } catch {
      paper = loadPaperFromFile(id);
    }
    
    if (!paper) {
      const papers = loadPapersFromFiles();
      paper = papers.find(p => p.id === id);
    }
    
    if (!paper) {
      return NextResponse.json(
        { success: false, message: '论文不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: paper,
    });
  } catch (error) {
    console.error('获取论文详情失败:', error);
    return NextResponse.json(
      { success: false, message: '获取论文详情失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    let existing = null;
    let isLocal = false;
    
    try {
      existing = await prisma.paper.findUnique({
        where: { id }
      });
    } catch {
      existing = loadPaperFromFile(id);
      isLocal = true;
    }
    
    if (!existing) {
      const papers = loadPapersFromFiles();
      existing = papers.find(p => p.id === id);
      isLocal = true;
    }
    
    if (!existing) {
      return NextResponse.json(
        { success: false, message: '论文不存在' },
        { status: 404 }
      );
    }
    
    let paper = null;
    
    if (!isLocal) {
      try {
        paper = await prisma.paper.update({
          where: { id },
          data: {
            ...(body.title && { title: body.title.substring(0, 500) }),
            ...(body.abstract && { abstract: body.abstract }),
            ...(body.authors && { authors: body.authors }),
            ...(body.sourceType && { sourceType: body.sourceType }),
            ...(body.sourceUrl && { sourceUrl: body.sourceUrl }),
            ...(body.pdfPath && { pdfPath: body.pdfPath }),
            ...(body.publishedAt && { publishedAt: new Date(body.publishedAt) }),
            ...(body.tags && { tags: body.tags }),
            ...(body.direction && { direction: body.direction }),
            ...(body.notes && { notes: body.notes }),
            ...(body.summary && { summary: body.summary }),
            ...(body.methodology && { methodology: body.methodology }),
            ...(body.contribution && { contribution: body.contribution }),
          },
        });
      } catch (dbError) {
        console.warn(`Failed to update in PostgreSQL, updating local file: ${dbError}`);
        isLocal = true;
      }
    }
    
    if (isLocal) {
      const dir = getLocalPapersDir();
      const updatedPaper = {
        ...existing,
        ...body,
        updatedAt: new Date().toISOString(),
      };
      const filePath = path.join(dir, `${id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(updatedPaper, null, 2));
      paper = updatedPaper;
    }
    
    return NextResponse.json({
      success: true,
      message: isLocal ? '论文更新成功（使用本地文件存储）' : '论文更新成功',
      data: paper,
    });
  } catch (error) {
    console.error('更新论文失败:', error);
    return NextResponse.json(
      { success: false, message: '更新论文失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    let deleted = false;
    let isLocal = false;
    
    try {
      await prisma.paper.delete({
        where: { id },
      });
      deleted = true;
    } catch {
      deleted = deletePaperFile(id);
      isLocal = true;
    }
    
    if (!deleted) {
      const papers = loadPapersFromFiles();
      const existing = papers.find(p => p.id === id);
      if (existing) {
        deleted = deletePaperFile(id);
        isLocal = true;
      }
    }
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: '论文不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: isLocal ? '论文删除成功（使用本地文件存储）' : '论文删除成功',
    });
  } catch (error) {
    console.error('删除论文失败:', error);
    return NextResponse.json(
      { success: false, message: '删除论文失败' },
      { status: 500 }
    );
  }
}