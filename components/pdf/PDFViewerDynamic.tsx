'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import type { Annotation, StickyNote } from '@/lib/db/types';
import AnnotationLayer from '@/components/annotation/AnnotationLayer';
import StickyNoteLayer from '@/components/annotation/StickyNoteLayer';

const Document = dynamic(() => import('react-pdf').then(mod => mod.Document), { ssr: false });
const Page = dynamic(() => import('react-pdf').then(mod => mod.Page), { ssr: false });

interface PDFViewerDynamicProps {
  file: string;
  currentPage: number;
  scale: number;
  annotations: Annotation[];
  stickyNotes?: StickyNote[];
  /** 贴便签模式：开启后点击页面任意位置新建一个 📒 */
  noteMode?: boolean;
  onCreateStickyNote?: (x: number, y: number) => Promise<StickyNote | null>;
  onUpdateStickyNote?: (id: string, patch: Partial<Pick<StickyNote, 'x' | 'y' | 'content'>>) => void;
  onDeleteStickyNote?: (id: string) => void;
  onLoadSuccess: (numPages: number) => void;
  onLoadError?: (error: Error) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  /** 原文链接（DOI / 出版商页）——无法内联阅读时供「打开原文」兜底 */
  sourceUrl?: string;
  /** 用户手动选了一个本地 PDF：缓存为 Blob 后即可离线内联阅读 */
  onPickPdf?: (file: File) => void;
  /** 已知没有可内联的 PDF（如 pdfPath 指向 DOI 落地页）：直接显示兜底，不发起注定失败的请求 */
  unavailable?: boolean;
}

export default function PDFViewerDynamic({
  file,
  currentPage,
  scale,
  annotations,
  stickyNotes,
  noteMode = false,
  onCreateStickyNote,
  onUpdateStickyNote,
  onDeleteStickyNote,
  onLoadSuccess,
  onLoadError,
  sourceUrl,
  onPickPdf,
  unavailable = false,
}: PDFViewerDynamicProps) {
  const [mounted, setMounted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [workerReady, setWorkerReady] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initPDFJS = async () => {
      try {
        const { pdfjs } = await import('react-pdf');
        // Prefer local worker in `public` to avoid network fetch issues / CORS.
        const localWorker = '/pdf.worker.min.mjs';
        try {
          pdfjs.GlobalWorkerOptions.workerSrc = localWorker;
        } catch {
          pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        }
        setWorkerReady(true);
      } catch (error) {
        console.error('[PDFViewer] Failed to initialize PDF.js:', error);
        setLoadError('PDF 阅读器初始化失败');
      }
    };

    initPDFJS();
    // 一次性挂载水合，非级联渲染
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('[PDFViewer] Load success:', { numPages, file });
    setIsLoading(false);
    setLoadError(null);
    onLoadSuccess(numPages);
  };

  const handleLoadError = (error: Error) => {
    console.error('[PDFViewer] Load error:', { error: error.message, file });
    setIsLoading(false);
    setLoadError(error.message);
    if (onLoadError) {
      onLoadError(error);
    }
  };

  useEffect(() => {
    console.log('[PDFViewer] File path:', file);
  }, [file]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px]">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-coral border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-ink-3">正在初始化阅读器...</p>
        </div>
      </div>
    );
  }

  if (!workerReady) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px]">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-coral border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-ink-3">正在加载 PDF 引擎...</p>
        </div>
      </div>
    );
  }

  // 无法内联阅读时的友好兜底：要么这篇没有开放获取 PDF（unavailable），
  // 要么远端抓取失败（loadError，如出版商 403 → 代理 502）。给「打开原文」
  // 和「上传本地 PDF」两条出路，而不是抛一堆技术错误。
  if (unavailable || loadError) {
    const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f && onPickPdf) onPickPdf(f);
      e.target.value = ''; // 允许重复选择同一文件
    };

    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[600px] text-ink-3 p-8">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-coral/12 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-ink-2 mb-2">暂无可直接阅读的 PDF</h3>
          <p className="text-sm mb-6">
            这篇论文没有可内联阅读的开放获取 PDF（可能是订阅期刊或出版商不允许直接抓取）。
            你可以打开原文页面，或手动上传一份 PDF 后离线阅读与批注。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2 text-sm text-ink-2 hover:bg-paper-3 transition-colors focus-ring"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                打开原文
              </a>
            )}
            {onPickPdf && (
              <label className="inline-flex items-center gap-2 rounded-full cta-gradient px-5 py-2 text-sm font-medium cursor-pointer focus-ring">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                上传 PDF
                <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={handleFilePick} />
              </label>
            )}
          </div>
          {loadError && (
            <p className="mt-5 text-xs text-ink-4">加载失败：{loadError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={pdfContainerRef}
      className="w-full h-full flex items-start justify-center overflow-auto p-6"
    >
      <div className="relative pdf-reading-page">
        <Document
          file={file}
          onLoadSuccess={handleLoadSuccess}
          onLoadError={handleLoadError}
          loading={
            <div className="flex items-center justify-center min-h-[600px] w-full">
              <div className="text-center">
                <div className="w-12 h-12 border-3 border-coral border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-ink-3">正在加载论文...</p>
                {isLoading && (
                  <p className="text-xs text-ink-4 mt-2">{file}</p>
                )}
              </div>
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center min-h-[600px] text-ink-3">
              <div className="w-16 h-16 bg-coral/12 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-lg mb-2">PDF 加载失败</p>
              <p className="text-sm">文件可能不存在或已损坏</p>
              <p className="text-xs mt-4 text-ink-4">{file}</p>
            </div>
          }
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            className="rounded-lg overflow-hidden"
            loading={
              <div className="min-h-[600px] bg-paper-2/60 rounded-lg flex items-center justify-center w-full">
                <div className="w-8 h-8 border-2 border-coral border-t-transparent rounded-full animate-spin" />
              </div>
            }
            error={
              <div className="min-h-[600px] bg-paper-2/60 flex flex-col items-center justify-center text-ink-4 rounded-lg">
                <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>页面加载失败</p>
                <p className="text-xs mt-2">第 {currentPage} 页</p>
              </div>
            }
          />
        </Document>
        
        <AnnotationLayer
          annotations={annotations}
          currentPage={currentPage - 1}
          scale={scale}
        />
        {onCreateStickyNote && onUpdateStickyNote && onDeleteStickyNote && (
          <StickyNoteLayer
            notes={stickyNotes ?? []}
            currentPage={currentPage - 1}
            scale={scale}
            noteMode={noteMode}
            onCreate={onCreateStickyNote}
            onUpdate={onUpdateStickyNote}
            onDelete={onDeleteStickyNote}
          />
        )}
        <style jsx global>{`
          .pdf-reading-page {
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .pdf-reading-page .react-pdf__Page {
            /* 关键：让画布与文字层保持同一坐标系。
               不要用 max-width/height:auto 去 CSS 缩放 canvas——
               文字层是按 --scale-factor 绝对定位的，CSS 单独缩放 canvas
               会让两者错位，选中时高亮与字形分离，看上去就是“重影”。
               缩放统一交给 react-pdf 的 scale 参数完成。 */
            position: relative;
          }

          .pdf-reading-page .react-pdf__Page__canvas {
            box-shadow: 0 8px 30px -8px rgba(26, 23, 19, 0.28);
            border-radius: 0.5rem;
          }

          /* 文字层只用于选区，保持透明并与字形 1:1 对齐 */
          .pdf-reading-page .react-pdf__Page__textContent span {
            text-shadow: none !important;
          }

          .pdf-reading-page .react-pdf__Page__textContent ::selection {
            background: rgba(246, 194, 90, 0.4);
            /* 关键：选中时让文字层字形保持隐形，只留高亮底色叠在 canvas 真实文字上。
               否则全局 ::selection 的 color: var(--ink) 会点亮文字层字形，与 canvas
               字形错位形成「重影」。 */
            color: transparent;
          }

          .pdf-reading-page .react-pdf__Page__annotationLayer {
            pointer-events: none;
          }
        `}</style>
      </div>
    </div>
  );
}
