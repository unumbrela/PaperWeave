import { NextResponse } from 'next/server';
import { 
  createAnnotation, 
  getAnnotationsByPaperId, 
  updateAnnotation, 
  deleteAnnotation,
  ANNOTATION_COLORS 
} from '@/lib/annotation/service';
import type { AnnotationType } from '@prisma/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paperId, page, rects, selectedText, type, comment } = body;
    
    console.log('[API] Creating annotation:', { paperId, page, type, comment, selectedText });
    
    if (!paperId || page === undefined || page === null || !Array.isArray(rects) || !type) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    const color = ANNOTATION_COLORS[type as AnnotationType] || '#F6E7B2';
    
    const annotation = await createAnnotation({
      paperId,
      page,
      rects,
      selectedText,
      type: type as AnnotationType,
      color,
      comment,
    });
    
    console.log('[API] Annotation created:', annotation);
    
    if (annotation) {
      return NextResponse.json({
        success: true,
        data: annotation,
      });
    }
    
    return NextResponse.json(
      { success: false, message: '创建标注失败' },
      { status: 500 }
    );
  } catch (error) {
    console.error('创建标注失败:', error);
    return NextResponse.json(
      { success: false, message: '创建标注失败' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const paperId = url.searchParams.get('paperId');
    
    if (!paperId) {
      return NextResponse.json(
        { success: false, message: '缺少 paperId 参数' },
        { status: 400 }
      );
    }
    
    const annotations = await getAnnotationsByPaperId(paperId);
    
    return NextResponse.json({
      success: true,
      data: annotations,
    });
  } catch (error) {
    console.error('获取标注失败:', error);
    return NextResponse.json(
      { success: false, message: '获取标注失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, type, color, comment, aiSummary } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: '缺少 id 参数' },
        { status: 400 }
      );
    }
    
    const data: any = {};
    if (type) data.type = type;
    if (color) data.color = color;
    if (comment !== undefined) data.comment = comment;
    if (aiSummary) data.aiSummary = aiSummary;
    
    console.log('[API] Updating annotation:', { id, data });
    
    const annotation = await updateAnnotation(id, data);
    
    console.log('[API] Update result:', annotation);
    
    if (annotation) {
      return NextResponse.json({
        success: true,
        data: annotation,
      });
    }
    
    return NextResponse.json(
      { success: false, message: '更新标注失败，标注可能不存在' },
      { status: 500 }
    );
  } catch (error) {
    console.error('更新标注失败:', error);
    return NextResponse.json(
      { success: false, message: '更新标注失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: '缺少 id 参数' },
        { status: 400 }
      );
    }
    
    const success = await deleteAnnotation(id);
    
    return NextResponse.json({
      success,
      message: success ? '删除成功' : '删除失败',
    });
  } catch (error) {
    console.error('删除标注失败:', error);
    return NextResponse.json(
      { success: false, message: '删除标注失败' },
      { status: 500 }
    );
  }
}
