'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Paper, AnnotationType } from '@/lib/db/types';
import { repository } from '@/lib/db/repository';
import FloatingMenu from '@/components/annotation/FloatingMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import PDFViewerDynamic from '@/components/pdf/PDFViewerDynamic';
import { ViewerHeader } from '@/components/viewer/ViewerHeader';
import { PdfToolbar } from '@/components/viewer/PdfToolbar';
import { generateMarkdown, downloadMarkdown } from '@/lib/export/markdown';
import { useAnnotations, useResearchNotes, useStickyNotes, useAIExplanation } from '@/lib/annotation/hooks';
import { CenteredLoading } from '@/components/states';
import { stageHandoff } from '@/lib/workflow/handoff';

// pdfPath 形如 `/api/pdf-proxy?url=<encoded>`。若代理目标是 doi.org 等 DOI 落地页，
// 它返回的是 HTML 而非 PDF（抓回来必 415/502），视为「无可内联 PDF」。
function proxiedTargetIsLanding(pdfPath: string): boolean {
  try {
    const query = pdfPath.split('?')[1];
    if (!query) return false;
    const target = new URLSearchParams(query).get('url');
    if (!target) return false;
    const host = new URL(target).hostname.toLowerCase();
    return host === 'doi.org' || host === 'dx.doi.org' || host.endsWith('.doi.org');
  } catch {
    return false;
  }
}

export default function ViewerClient() {
  const params = useParams();
  const router = useRouter();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [fitMode, setFitMode] = useState<'page' | 'width'>('width');
  const [floatingMenu, setFloatingMenu] = useState<{ x: number; y: number; text: string } | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const [selectionRects, setSelectionRects] = useState<Array<{ x: number; y: number; width: number; height: number }>>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [copiedState, setCopiedState] = useState<{ [key: string]: boolean }>({});
  const [noteMode, setNoteMode] = useState(false);
  // 正在生成 AI 解释的标注 id —— 解释逐条挂到标注，不再共用一个全局槽位。
  const [explainingId, setExplainingId] = useState<string | null>(null);

  const { annotations, fetchAnnotations, createAnnotation, updateAnnotation, deleteAnnotation } = useAnnotations(params.id as string);
  const { stickyNotes, fetchStickyNotes, createStickyNote, updateStickyNote, deleteStickyNote } = useStickyNotes(params.id as string);
  const { notes: researchNotes, setNotes: setResearchNotes, fetchNotes, saveNotes } = useResearchNotes(params.id as string);
  const { explain: requestAIExplanation } = useAIExplanation();

  useEffect(() => {
    const fetchPaper = async () => {
      try {
        setLoading(true);
        const found = await repository.getPaper(params.id as string);

        if (found) {
          setPaper(found);
          setError(null);
        } else {
          setError('论文不存在');
        }
      } catch (err) {
        console.error('获取论文失败:', err);
        setError('获取论文失败');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchPaper();
    }
  }, [params.id]);

  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    fetchStickyNotes();
  }, [fetchStickyNotes]);

  useEffect(() => {
    const debounce = setTimeout(() => saveNotes(researchNotes), 800);
    return () => clearTimeout(debounce);
  }, [researchNotes, saveNotes]);

  // 自动保存阅读进度（翻页后防抖写入本地）
  useEffect(() => {
    if (!params.id || numPages < 1) return;
    const debounce = setTimeout(() => {
      repository.saveProgress(params.id as string, currentPage, numPages).catch(() => {});
    }, 600);
    return () => clearTimeout(debounce);
  }, [params.id, currentPage, numPages]);

  const handleDocumentLoadSuccess = async (info: { numPages: number } | number) => {
    const totalPages = typeof info === 'number' ? info : info.numPages;
    setNumPages(totalPages);
    // 恢复上次阅读进度
    try {
      const saved = await repository.getProgress(params.id as string);
      if (saved && saved.currentPage >= 1 && saved.currentPage <= totalPages) {
        setCurrentPage(saved.currentPage);
      }
    } catch {
      // 无进度记录，忽略
    }
  };

  const handleFitWidth = () => {
    setFitMode('width');
    setScale(1.0);
  };

  const handleFitPage = () => {
    setFitMode('page');
    setScale(0.7);
  };

  const calculateFitWidthScale = useCallback(() => {
    if (!pdfContainerRef.current) return;

    const containerWidth = pdfContainerRef.current.offsetWidth;
    const padding = 32;
    const availableWidth = containerWidth - padding;

    const standardPageWidth = 612;
    const targetScale = availableWidth / standardPageWidth;

    return Math.min(Math.max(targetScale, 0.3), 2);
  }, []);

  const handleAutoFit = useCallback(() => {
    if (fitMode === 'width') {
      const targetScale = calculateFitWidthScale();
      if (targetScale) {
        setScale(targetScale);
      }
    }
  }, [fitMode, calculateFitWidthScale]);

  useEffect(() => {
    const handleResize = () => {
      handleAutoFit();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleAutoFit]);

  useEffect(() => {
    if (fitMode === 'width') {
      const timer = setTimeout(() => {
        handleAutoFit();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [fitMode, handleAutoFit]);

  const handleCopyLink = async (key: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedState(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedState(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleDocumentLoadError = (error: Error) => {
    console.error('PDF加载失败:', error);
    setError('PDF加载失败');
  };

  const handleTextSelection = useCallback(() => {
    if (noteMode) return; // 贴便签模式下点击用于放置 📒，不弹选区菜单
    const selection = window.getSelection();
    if (!selection) return;

    const selectedText = selection.toString().trim();

    if (selectedText && selectedText.length > 0 && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectionNode = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? (range.commonAncestorContainer as Element)
        : range.commonAncestorContainer.parentElement;
      const pageElement = selectionNode?.closest('.react-pdf__Page') as HTMLElement | null;

      if (!pageElement) return;

      const pageRect = pageElement.getBoundingClientRect();
      const rects = Array.from(range.getClientRects())
        .map((rect) => ({
          x: (rect.left - pageRect.left) / scale,
          y: (rect.top - pageRect.top) / scale,
          width: rect.width / scale,
          height: rect.height / scale,
        }))
        .filter((rect) => rect.width > 2 && rect.height > 2);

      if (rects.length === 0) return;

      const rect = range.getBoundingClientRect();
      setSelectionRects(rects);

      setFloatingMenu({
        x: rect.left + rect.width / 2,
        y: rect.top,
        text: selectedText,
      });
    }
  }, [scale, noteMode]);

  useEffect(() => {
    document.addEventListener('mouseup', handleTextSelection);
    return () => document.removeEventListener('mouseup', handleTextSelection);
  }, [handleTextSelection]);

  // 放置一个便签后自动退出贴便签模式，恢复正常的选字批注交互
  const handleCreateStickyNote = useCallback(async (x: number, y: number) => {
    const created = await createStickyNote({ page: currentPage - 1, x, y });
    setNoteMode(false);
    return created;
  }, [createStickyNote, currentPage]);

  const handleCreateAnnotation = async (type: AnnotationType, text: string, comment?: string) => {
    if (!params.id || !paper) return;
    console.log('[Viewer] Creating annotation:', { type, text, comment, paperId: params.id });

    const result = await createAnnotation({
      page: currentPage - 1,
      rects: selectionRects,
      selectedText: text,
      type,
      comment,
    });

    console.log('[Viewer] Annotation created:', result);
    setSelectionRects([]);
    window.getSelection()?.removeAllRanges();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    console.log('[Viewer] Copied to clipboard:', text);
  };

  // 选区 → AI 解释：先把选区落成一条 insight 标注，再请求解释并挂到该标注的
  // aiSummary 字段。多段选区各自成条、互不覆盖，可在侧栏逐条回看与导出。
  const handleAIExplainSelection = async (text: string) => {
    if (!params.id || !paper || !text.trim()) return;
    const rects = selectionRects;
    const created = await createAnnotation({
      page: currentPage - 1,
      rects,
      selectedText: text,
      type: 'insight',
    });
    setSelectionRects([]);
    window.getSelection()?.removeAllRanges();
    if (!created) return;
    setExplainingId(created.id);
    try {
      const data = await requestAIExplanation(text);
      if (data) await updateAnnotation(created.id, { aiSummary: data });
    } finally {
      setExplainingId(null);
    }
  };

  const handleEditAnnotation = async (id: string, comment: string) => {
    console.log('[Viewer] Editing annotation:', id, comment);
    await updateAnnotation(id, { comment });
  };

  const handleExport = () => {
    if (!paper) return;

    const markdown = generateMarkdown({
      paper,
      annotations,
      researchNotes,
      stickyNotes,
    });

    downloadMarkdown(markdown, `${paper.title.replace(/[^a-z0-9]/gi, '_')}_research_brief.md`);
  };

  // 接回工作流：把本篇的精读 brief（批注 + 笔记 + AI 解释）作为「已知工作」
  // 发往 创新点立论，并带上 sourcePaperId 以便下游回存。闭合「精读 → 立论」。
  const handleSendToIdea = () => {
    if (!paper) return;
    const brief = generateMarkdown({ paper, annotations, researchNotes, stickyNotes });
    stageHandoff('idea-generator', {
      from: `精读 · ${paper.title}`,
      sourcePaperId: paper.id,
      fields: { direction: paper.direction ?? '', references: brief },
    });
    router.push('/tools/idea-generator');
  };

  const [pdfFilePath, setPdfFilePath] = useState<string | null>(null);
  // 当前展示的 PDF 是否来自本地离线缓存（Blob）。用于决定是否需要自动「暖缓存」。
  const [pdfFromCache, setPdfFromCache] = useState(false);
  // 没有可内联阅读的 PDF（无 pdfPath，或 pdfPath 指向 DOI 落地页）→ 直接走兜底面板
  const [pdfUnavailable, setPdfUnavailable] = useState(false);

  useEffect(() => {
    if (!paper) return;
    const paperId = paper.id;
    let objectUrl: string | null = null;
    let cancelled = false;

    const resolvePath = (remotePath: string) =>
      remotePath.startsWith('http') ? remotePath : (remotePath.startsWith('/') ? remotePath : `/${remotePath}`);

    const resolve = async () => {
      // 1) 优先用本地离线缓存的 Blob —— 断网也能读
      try {
        const blob = await repository.getPdfBlob(paperId);
        if (blob && !cancelled) {
          objectUrl = URL.createObjectURL(blob);
          setPdfFilePath(objectUrl);
          setPdfFromCache(true);
          setPdfUnavailable(false);
          return;
        }
      } catch {
        // 无缓存或读取失败，落到网络/服务端路径
      }
      if (cancelled) return;
      setPdfFromCache(false);

      // 2) 无 pdfPath，或 pdfPath 包进代理的目标是 DOI/落地页（注定不是 PDF，抓回来必 502/415）：
      //    不发起注定失败的请求，直接显示兜底（打开原文 / 上传 PDF）。
      if (!paper.pdfPath || proxiedTargetIsLanding(paper.pdfPath)) {
        setPdfFilePath(null);
        setPdfUnavailable(true);
        return;
      }

      // 3) 有可用的 pdfPath（arXiv 走同源 /api/pdf-proxy，或远端直链）。
      setPdfUnavailable(false);
      setPdfFilePath(resolvePath(paper.pdfPath));
    };

    resolve();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [paper]);

  // 用户手动上传一份 PDF：缓存为本地 Blob 后立即内联渲染（并实现离线复读）。
  const handlePickPdf = useCallback(async (file: File) => {
    if (!paper) return;
    try {
      await repository.cachePdfBlob(paper.id, file);
      setPdfFilePath(URL.createObjectURL(file));
      setPdfFromCache(true);
      setPdfUnavailable(false);
    } catch (e) {
      console.error('上传 PDF 失败:', e);
    }
  }, [paper]);

  // 暖缓存：首次从网络/服务端成功拿到 PDF 后，后台静默存为本地 Blob，
  // 下次（含断网）即可离线阅读。失败完全忽略，不影响当前阅读。
  useEffect(() => {
    if (!paper || !pdfFilePath || pdfFromCache) return;
    if (pdfFilePath.startsWith('blob:')) return;
    const paperId = paper.id;
    let cancelled = false;

    const warm = async () => {
      try {
        if (await repository.getPdfBlob(paperId)) return; // 已有缓存
        const res = await fetch(pdfFilePath);
        if (!res.ok || cancelled) return;
        const blob = await res.blob();
        if (blob.type && !blob.type.includes('pdf') && blob.size < 1024) return; // 非 PDF 兜底
        if (!cancelled) await repository.cachePdfBlob(paperId, blob);
      } catch {
        // 暖缓存失败无所谓，下次再试
      }
    };

    warm();
    return () => {
      cancelled = true;
    };
  }, [paper, pdfFilePath, pdfFromCache]);

  if (loading) {
    return (
      <div className="h-dvh bg-paper">
        <CenteredLoading label="正在加载论文…" />
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="h-dvh flex items-center justify-center bg-paper">
        <div className="text-center">
          <p className="text-ink-3 mb-4">{error || '论文不存在'}</p>
          <button
            onClick={() => router.push('/library')}
            className="cta-gradient rounded-full px-5 py-2 text-sm font-medium focus-ring"
          >
            返回论文库
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col bg-paper">
      <ViewerHeader
        title={paper.title}
        sourceUrl={paper.sourceUrl}
        pdfFilePath={pdfFilePath}
        copiedState={copiedState}
        onCopyLink={handleCopyLink}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onExport={handleExport}
        onSendToIdea={handleSendToIdea}
        onBack={() => router.push(`/library/${paper.id}`)}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <PdfToolbar
            currentPage={currentPage}
            numPages={numPages}
            scale={scale}
            fitMode={fitMode}
            noteMode={noteMode}
            onPrev={() => setCurrentPage(Math.max(1, currentPage - 1))}
            onNext={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
            onFitWidth={handleFitWidth}
            onFitPage={handleFitPage}
            onZoomOut={() => setScale(Math.max(0.3, scale - 0.1))}
            onZoomIn={() => setScale(Math.min(3, scale + 0.1))}
            onResetZoom={() => setScale(1.0)}
            onToggleNoteMode={() => setNoteMode((v) => !v)}
          />

          {/* 阅读进度条：随翻页推进（进度本身已本地持久化） */}
          {numPages > 0 && (
            <div className="h-0.5 w-full bg-line/40" aria-hidden>
              <div
                className="h-full bg-coral transition-[width] duration-300 ease-out"
                style={{ width: `${Math.min(100, (currentPage / numPages) * 100)}%` }}
              />
            </div>
          )}

          <div ref={pdfContainerRef} className="flex-1 overflow-auto bg-paper-3">
            {pdfFilePath || pdfUnavailable ? (
              <PDFViewerDynamic
                file={pdfFilePath ?? ''}
                currentPage={currentPage}
                scale={scale}
                annotations={annotations}
                stickyNotes={stickyNotes}
                noteMode={noteMode}
                onCreateStickyNote={handleCreateStickyNote}
                onUpdateStickyNote={updateStickyNote}
                onDeleteStickyNote={deleteStickyNote}
                onLoadSuccess={handleDocumentLoadSuccess}
                onLoadError={handleDocumentLoadError}
                sourceUrl={paper.sourceUrl}
                onPickPdf={handlePickPdf}
                unavailable={pdfUnavailable}
              />
            ) : (
              <CenteredLoading label="正在定位 PDF 文件…" />
            )}
          </div>
        </div>

        {isSidebarOpen && (
          <Sidebar
            annotations={annotations}
            stickyNotes={stickyNotes}
            explainingId={explainingId}
            researchNotes={researchNotes}
            onDeleteAnnotation={deleteAnnotation}
            onEditAnnotation={handleEditAnnotation}
            onResearchNotesChange={setResearchNotes}
            onDeleteStickyNote={deleteStickyNote}
            onJumpToPage={(page) => setCurrentPage(page + 1)}
          />
        )}
      </div>

      {floatingMenu && (
        <FloatingMenu
          position={{ x: floatingMenu.x, y: floatingMenu.y }}
          selectedText={floatingMenu.text}
          onSelect={handleCreateAnnotation}
          onAIExplain={handleAIExplainSelection}
          onCopy={handleCopy}
          onClose={() => setFloatingMenu(null)}
        />
      )}
    </div>
  );
}
