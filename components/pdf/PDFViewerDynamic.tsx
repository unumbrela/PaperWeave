'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import type { Annotation } from '@/lib/db/types';
import AnnotationLayer from '@/components/annotation/AnnotationLayer';

const Document = dynamic(() => import('react-pdf').then(mod => mod.Document), { ssr: false });
const Page = dynamic(() => import('react-pdf').then(mod => mod.Page), { ssr: false });

interface PDFViewerDynamicProps {
  file: string;
  currentPage: number;
  scale: number;
  annotations: Annotation[];
  onLoadSuccess: (numPages: number) => void;
  onLoadError?: (error: Error) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export default function PDFViewerDynamic({
  file,
  currentPage,
  scale,
  annotations,
  onLoadSuccess,
  onLoadError,
  containerRef,
}: PDFViewerDynamicProps) {
  const [mounted, setMounted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [workerReady, setWorkerReady] = useState(false);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null);
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

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[600px] text-ink-3 p-8">
        <div className="max-w-lg text-center">
          <div className="w-16 h-16 bg-coral/12 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-ink-2 mb-2">PDF 加载失败</h3>
          <p className="text-sm mb-4">文件可能不存在、已损坏或无法解析</p>
          <div className="bg-paper-2/60 rounded-lg p-4 text-left text-xs mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-ink-4">文件路径:</span>
              <code className="text-ocean break-all">{file}</code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ink-4">错误信息:</span>
              <code className="text-coral">{loadError}</code>
            </div>
          </div>
          <div className="text-xs text-ink-4">
            <p className="mb-1">常见原因:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>PDF 文件格式不受支持</li>
              <li>文件已损坏或加密</li>
              <li>网络请求超时</li>
              <li>浏览器缓存问题</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={pdfContainerRef}
      className="w-full h-full flex items-start justify-center overflow-auto"
    >
      <div className="relative pdf-reading-page max-w-full">
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
            className="shadow-xl rounded-lg"
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
        <style jsx global>{`
          .pdf-reading-page {
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .pdf-reading-page .react-pdf__Page {
            display: flex;
            justify-content: center;
          }

          .pdf-reading-page .react-pdf__Page canvas {
            max-width: 100%;
            height: auto;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            border-radius: 0.5rem;
          }

          .pdf-reading-page .react-pdf__Page__textContent {
            mix-blend-mode: normal;
            text-shadow: none !important;
          }

          .pdf-reading-page .react-pdf__Page__textContent span {
            color: transparent !important;
            text-shadow: none !important;
          }

          .pdf-reading-page .react-pdf__Page__textContent ::selection {
            background: rgba(246, 194, 90, 0.32);
          }

          .pdf-reading-page .react-pdf__Page__annotationLayer {
            pointer-events: none;
          }
        `}</style>
      </div>
    </div>
  );
}
