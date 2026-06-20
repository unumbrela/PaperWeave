'use client';

import Link from 'next/link';
import { ArrowLeft, Share2, Copy, Check, ExternalLink, PanelRight, PanelRightClose, Lightbulb } from 'lucide-react';
import { AccountButton } from '@/components/auth/AccountButton';

/** 精读阅读器顶栏：左侧品牌 + 返回 + 标题，右侧链接/侧栏/导出/账户。
 *  这是沉浸式全屏模式下的唯一顶栏（全局导航在 /viewer 路由隐藏）。 */
export function ViewerHeader({
  title,
  sourceUrl,
  pdfFilePath,
  copiedState,
  onCopyLink,
  isSidebarOpen,
  onToggleSidebar,
  onExport,
  onSendToIdea,
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
  /** 发往 创新点立论（把本篇精读 brief 作为已知工作） */
  onSendToIdea?: () => void;
  onBack: () => void;
}) {
  return (
    <header className="surface-strong border-b border-line px-4 h-14 flex items-center justify-between gap-4 shrink-0">
      {/* 左侧：品牌 + 返回 + 标题 */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/"
          className="flex items-center gap-2 font-medium tracking-tight text-ink shrink-0"
          title="返回 PaperWeave 首页"
        >
          <span
            aria-hidden
            className="inline-block h-4 w-4 rounded-full bg-[conic-gradient(from_220deg,#ff5d4d,#f4c25a,#6b9b6f,#3b6ef6,#9b5de5,#ff5d4d)] shadow-[inset_0_0_0_1px_rgba(26,23,19,0.12)]"
          />
          <span className="serif text-lg leading-none hidden md:inline">
            Paper<span className="serif-italic">Weave</span>
          </span>
        </Link>

        <div className="h-5 w-px bg-line-strong shrink-0" />

        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-ink-2 hover:text-ink hover:bg-paper-3 transition-colors shrink-0"
          title="返回论文详情"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm hidden sm:inline">返回</span>
        </button>

        <h1 className="serif text-ink text-base sm:text-lg truncate min-w-0">{title}</h1>
      </div>

      {/* 右侧：链接 / 侧栏开关 / 导出 / 账户 */}
      <div className="flex items-center gap-1.5 shrink-0">
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-ink-2 hover:text-ink hover:bg-paper-3 transition-colors"
            title="打开论文来源链接"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden lg:inline">来源</span>
          </a>
        )}

        {pdfFilePath && (
          <button
            onClick={() => onCopyLink('pdf', pdfFilePath)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-ink-2 hover:text-ink hover:bg-paper-3 transition-colors"
            title="复制 PDF 链接"
          >
            {copiedState['pdf'] ? (
              <Check className="w-4 h-4 text-sage" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span className="hidden lg:inline">{copiedState['pdf'] ? '已复制' : '链接'}</span>
          </button>
        )}

        <button
          onClick={onToggleSidebar}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-ink-2 hover:text-ink hover:bg-paper-3 transition-colors"
          title={isSidebarOpen ? '隐藏侧边栏' : '显示侧边栏'}
        >
          {isSidebarOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
          <span className="hidden lg:inline">{isSidebarOpen ? '隐藏侧栏' : '显示侧栏'}</span>
        </button>

        {onSendToIdea && (
          <button
            onClick={onSendToIdea}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-ink-2 transition-colors hover:text-ink hover:bg-paper-3"
            title="把本篇精读（批注 + 笔记）发往 创新点立论"
          >
            <Lightbulb className="w-4 h-4" />
            <span className="hidden lg:inline">发往 Idea</span>
          </button>
        )}

        <button
          onClick={onExport}
          className="flex items-center gap-2 rounded-full bg-ink px-4 py-1.5 text-paper-2 transition-all hover:brightness-110 focus-ring"
          title="导出研究简报"
        >
          <Share2 className="w-4 h-4" />
          <span className="text-sm hidden sm:inline">导出</span>
        </button>

        <div className="h-5 w-px bg-line-strong mx-1 shrink-0" />

        <AccountButton />
      </div>
    </header>
  );
}
