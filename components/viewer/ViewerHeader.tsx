'use client';

import { ArrowLeft, Share2, Copy, Check } from 'lucide-react';

/** 阅读器顶部栏：返回、标题、来源/PDF 链接复制、侧栏开关、导出研究简报。 */
export function ViewerHeader({
  title,
  sourceUrl,
  pdfFilePath,
  copiedState,
  onCopyLink,
  isSidebarOpen,
  onToggleSidebar,
  onExport,
  onBack,
}: {
  title: string;
  sourceUrl?: string;
  pdfFilePath: string | null;
  copiedState: { [key: string]: boolean };
  onCopyLink: (key: string, url: string) => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onExport: () => void;
  onBack: () => void;
}) {
  return (
    <div className="surface-strong border-b border-line px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-ink-2 hover:text-ink hover:bg-paper-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">返回</span>
        </button>
        <h1 className="serif text-ink text-lg truncate max-w-xl">{title}</h1>

        {sourceUrl && (
          <div className="mt-2 w-full max-w-xl">
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 border border-line bg-paper-2/70">
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-0 text-xs text-ocean truncate hover:underline transition-colors"
                title="打开链接"
              >
                {sourceUrl}
              </a>
              <button
                onClick={() => onCopyLink('source', sourceUrl)}
                className="flex-shrink-0 p-1 rounded-md hover:bg-paper-3 transition-colors"
                title="复制论文链接"
              >
                {copiedState['source'] ? (
                  <Check className="w-4 h-4 text-sage" />
                ) : (
                  <Copy className="w-4 h-4 text-ink-3 hover:text-ink" />
                )}
              </button>
            </div>
          </div>
        )}

        {pdfFilePath && (
          <div className="mt-1 w-full max-w-xl">
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 border border-line bg-ocean/8">
              <span className="text-xs text-ocean truncate flex-1">{pdfFilePath}</span>
              <button
                onClick={() => onCopyLink('pdf', pdfFilePath)}
                className="flex-shrink-0 p-1 rounded-md hover:bg-ocean/12 transition-colors"
                title="复制PDF链接"
              >
                {copiedState['pdf'] ? (
                  <Check className="w-4 h-4 text-sage" />
                ) : (
                  <Copy className="w-4 h-4 text-ocean" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-full px-3 py-1.5 text-sm text-ink-2 hover:text-ink hover:bg-paper-3 transition-colors"
        >
          {isSidebarOpen ? '隐藏侧边栏' : '显示侧边栏'}
        </button>
        <button
          onClick={onExport}
          className="flex items-center gap-2 rounded-full bg-ink px-4 py-1.5 text-paper-2 transition-all hover:brightness-110 focus-ring"
        >
          <Share2 className="w-4 h-4" />
          <span className="text-sm">导出</span>
        </button>
      </div>
    </div>
  );
}
