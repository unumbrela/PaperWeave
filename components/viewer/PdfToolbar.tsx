'use client';

import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';

/** PDF 阅读器的翻页 + 缩放工具条。 */
export function PdfToolbar({
  currentPage,
  numPages,
  scale,
  fitMode,
  onPrev,
  onNext,
  onFitWidth,
  onFitPage,
  onZoomOut,
  onZoomIn,
  onResetZoom,
}: {
  currentPage: number;
  numPages: number;
  scale: number;
  fitMode: 'page' | 'width';
  onPrev: () => void;
  onNext: () => void;
  onFitWidth: () => void;
  onFitPage: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onResetZoom: () => void;
}) {
  return (
    <div className="bg-paper-2/60 border-b border-line px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onPrev}
          disabled={currentPage <= 1}
          className="p-2 rounded-lg hover:bg-paper-3 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5 text-ink-2" />
        </button>
        <span className="text-sm text-ink-3">
          第 {currentPage} 页 / 共 {numPages} 页
        </span>
        <button
          onClick={onNext}
          disabled={currentPage >= numPages}
          className="p-2 rounded-lg hover:bg-paper-3 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5 text-ink-2" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onFitWidth}
          className={`p-2 rounded-lg transition-colors ${fitMode === 'width' ? 'bg-ink text-paper-2' : 'hover:bg-paper-3 text-ink-2'}`}
          title="适应宽度"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </button>
        <button
          onClick={onFitPage}
          className={`p-2 rounded-lg transition-colors ${fitMode === 'page' ? 'bg-ink text-paper-2' : 'hover:bg-paper-3 text-ink-2'}`}
          title="适应页面"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
        <div className="w-px h-6 bg-line-strong mx-2" />
        <button onClick={onZoomOut} className="p-2 rounded-lg hover:bg-paper-3" title="缩小">
          <ZoomOut className="w-5 h-5 text-ink-2" />
        </button>
        <span className="text-sm text-ink-3 w-16 text-center">{Math.round(scale * 100)}%</span>
        <button onClick={onZoomIn} className="p-2 rounded-lg hover:bg-paper-3" title="放大">
          <ZoomIn className="w-5 h-5 text-ink-2" />
        </button>
        <button onClick={onResetZoom} className="p-2 rounded-lg hover:bg-paper-3" title="重置">
          <RotateCcw className="w-5 h-5 text-ink-2" />
        </button>
      </div>
    </div>
  );
}
