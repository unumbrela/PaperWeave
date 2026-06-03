import { NextResponse } from 'next/server';
import { 
  createResearchNote, 
  getResearchNotesByPaperId, 
  updateResearchNote, 
  deleteResearchNote 
} from '@/lib/research-note/service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paperId, title, content } = body;
    
    if (!paperId || content === undefined) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    const note = await createResearchNote({
      paperId,
      title,
      content,
    });
    
    if (note) {
      return NextResponse.json({
        success: true,
        data: note,
      });
    }
    
    return NextResponse.json(
      { success: false, message: '创建笔记失败' },
      { status: 500 }
    );
  } catch (error) {
    console.error('创建笔记失败:', error);
    return NextResponse.json(
      { success: false, message: '创建笔记失败' },
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
    
    const notes = await getResearchNotesByPaperId(paperId);
    
    return NextResponse.json({
      success: true,
      data: notes,
    });
  } catch (error) {
    console.error('获取笔记失败:', error);
    return NextResponse.json(
      { success: false, message: '获取笔记失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, title, content } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: '缺少 id 参数' },
        { status: 400 }
      );
    }
    
    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content;
    
    const note = await updateResearchNote(id, data);
    
    if (note) {
      return NextResponse.json({
        success: true,
        data: note,
      });
    }
    
    return NextResponse.json(
      { success: false, message: '更新笔记失败' },
      { status: 500 }
    );
  } catch (error) {
    console.error('更新笔记失败:', error);
    return NextResponse.json(
      { success: false, message: '更新笔记失败' },
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
    
    const success = await deleteResearchNote(id);
    
    return NextResponse.json({
      success,
      message: success ? '删除成功' : '删除失败',
    });
  } catch (error) {
    console.error('删除笔记失败:', error);
    return NextResponse.json(
      { success: false, message: '删除笔记失败' },
      { status: 500 }
    );
  }
}
