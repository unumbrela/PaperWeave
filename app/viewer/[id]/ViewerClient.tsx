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

  const { annotations, fetchAnnotations, createAnnotation, updateAnnotation, deleteAnnotation } = useAnnotations(params.id as string);
  const { stickyNotes, fetchStickyNotes, createStickyNote, updateStickyNote, deleteStickyNote } = useStickyNotes(params.id as string);
  const { notes: researchNotes, setNotes: setResearchNotes, fetchNotes, saveNotes } = useResearchNotes(params.id as string);
  const { explanation: aiSummary, explain: requestAIExplanation } = useAIExplanation();

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

  const handleAIExplain = async (text: string) => {
    console.log('[Viewer] Starting AI explanation for:', text);
    await requestAIExplanation(text);
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
      aiSummary,
      researchNotes,
      stickyNotes,
    });

    downloadMarkdown(markdown, `${paper.title.replace(/[^a-z0-9]/gi, '_')}_research_brief.md`);
  };

  const [pdfFilePath, setPdfFilePath] = useState<string | null>(null);
  // 当前展示的 PDF 是否来自本地离线缓存（Blob）。用于决定是否需要自动「暖缓存」。
  const [pdfFromCache, setPdfFromCache] = useState(false);

  useEffect(() => {
    if (!paper) return;
    const paperId = paper.id;
    let objectUrl: string | null = null;
    let cancelled = false;

    const localCandidate = `/papers/${paperId}.pdf`;

    const resolvePath = (remotePath?: string) => {
      if (remotePath) {
        return remotePath.startsWith('http') ? remotePath : (remotePath.startsWith('/') ? remotePath : `/${remotePath}`);
      }
      return localCandidate;
    };

    const resolve = async () => {
      // 1) 优先用本地离线缓存的 Blob —— 断网也能读
      try {
        const blob = await repository.getPdfBlob(paperId);
        if (blob && !cancelled) {
          objectUrl = URL.createObjectURL(blob);
          setPdfFilePath(objectUrl);
          setPdfFromCache(true);
          return;
        }
      } catch {
        // 无缓存或读取失败，落到网络/服务端路径
      }
      if (cancelled) return;
      setPdfFromCache(false);

      // 2) 无本地缓存：直接用 pdfPath（arXiv 走同源 /api/pdf-proxy，或远端链接）。
      //    PDF 已不再落盘到 public/papers（serverless 只读 FS），故无需再探测本地静态路径。
      setPdfFilePath(resolvePath(paper.pdfPath));
    };

    resolve();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
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
      <div className="h-screen flex items-center justify-center bg-paper">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-coral border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-ink-3">正在加载论文…</p>
        </div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="h-screen flex items-center justify-center bg-paper">
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
    <div className="h-screen flex flex-col bg-paper">
      <ViewerHeader
        title={paper.title}
        sourceUrl={paper.sourceUrl}
        pdfFilePath={pdfFilePath}
        copiedState={copiedState}
        onCopyLink={handleCopyLink}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onExport={handleExport}
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

          <div ref={pdfContainerRef} className="flex-1 overflow-auto bg-paper-3">
            {pdfFilePath ? (
              <PDFViewerDynamic
                file={pdfFilePath}
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
              />
            ) : (
              <div className="flex items-center justify-center h-full min-h-[600px]">
                <div className="text-center">
                  <div className="w-12 h-12 border-3 border-coral border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-ink-3">正在定位 PDF 文件…</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {isSidebarOpen && (
          <Sidebar
            annotations={annotations}
            stickyNotes={stickyNotes}
            aiSummary={aiSummary}
            researchNotes={researchNotes}
            onDeleteAnnotation={deleteAnnotation}
            onEditAnnotation={handleEditAnnotation}
            onAIExplain={handleAIExplain}
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
          onAIExplain={handleAIExplain}
          onCopy={handleCopy}
          onClose={() => setFloatingMenu(null)}
        />
      )}
    </div>
  );
}
