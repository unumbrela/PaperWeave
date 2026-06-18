'use client';

import { useState } from 'react';
import {
  LayoutGrid,
  Highlighter,
  Lightbulb,
  CheckSquare,
  ArrowRight,
  Sparkles,
  FileText,
  Trash2,
  Edit2,
  Check,
  X
} from 'lucide-react';
import type { Annotation, AnnotationType, StickyNote } from '@/lib/db/types';
import { ANNOTATION_COLORS } from '@/lib/annotation/hooks';

const ANNOTATION_TYPE_LABELS: Record<AnnotationType, string> = {
  highlight: 'Highlight',
  insight: 'Insight',
  todo: 'Todo',
  transferable: 'Transferable',
};

function getAnnotationTypeLabel(type: AnnotationType): string {
  return ANNOTATION_TYPE_LABELS[type] || type;
}

interface SidebarProps {
  annotations: Annotation[];
  /** 页面便签（📒，锚定在 PDF 页面坐标上） */
  stickyNotes?: StickyNote[];
  /** 正在生成 AI 解释的标注 id（该卡显示 loading） */
  explainingId?: string | null;
  researchNotes: string;
  onDeleteAnnotation: (id: string) => void;
  onEditAnnotation: (id: string, comment: string) => Promise<void>;
  onResearchNotesChange: (content: string) => void;
  onDeleteStickyNote?: (id: string) => void;
  /** 跳转到便签所在页（0-based 页码） */
  onJumpToPage?: (page: number) => void;
}

type TabType = 'all' | 'highlight' | 'insight' | 'todo' | 'transferable' | 'ai' | 'notes';

const tabs: { id: TabType; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'all', label: 'All', icon: LayoutGrid },
  { id: 'highlight', label: 'Highlights', icon: Highlighter },
  { id: 'insight', label: 'Insights', icon: Lightbulb },
  { id: 'todo', label: 'Todo', icon: CheckSquare },
  { id: 'transferable', label: 'Transferable', icon: ArrowRight },
  { id: 'ai', label: 'AI', icon: Sparkles },
  { id: 'notes', label: 'Notes', icon: FileText },
];

export default function Sidebar({
  annotations,
  stickyNotes = [],
  explainingId,
  researchNotes,
  onDeleteAnnotation,
  onEditAnnotation,
  onResearchNotesChange,
  onDeleteStickyNote,
  onJumpToPage,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleStartEdit = (annotation: Annotation) => {
    setEditingId(annotation.id);
    setEditingText(annotation.comment || '');
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await onEditAnnotation(editingId, editingText);
      setEditingId(null);
    } catch (error) {
      console.error('保存注释失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const filteredAnnotations = activeTab === 'all'
    ? annotations
    : annotations.filter((a) => a.type === activeTab);

  const formatDate = (dateValue: string | Date) => {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderAnnotationCard = (annotation: Annotation, forceExpand = false) => {
    const isExpanded = forceExpand || expandedId === annotation.id;
    const isEditing = editingId === annotation.id;
    const isExplaining = explainingId === annotation.id;
    const hasAI = !!annotation.aiSummary;

    return (
      <div
        key={annotation.id}
        className="group rounded-xl p-4 bg-paper-2/60 border border-line hover:border-line-strong transition-all duration-200"
      >
        <div className="flex items-start gap-3">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
            style={{ backgroundColor: annotation.color }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${annotation.color}55`, color: 'var(--ink-2)' }}>
                {getAnnotationTypeLabel(annotation.type)}
              </span>
              <span className="text-xs text-ink-3">
                第 {annotation.page + 1} 页
              </span>
              {hasAI && (
                <span className="ml-auto inline-flex items-center gap-0.5 text-[10px] text-plum">
                  <Sparkles className="w-3 h-3" /> AI
                </span>
              )}
            </div>

            <p className="text-sm text-ink mb-2">
              {annotation.selectedText || '(无文本)'}
            </p>

            {isExplaining && (
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-plum/20 bg-plum/8 p-2 text-xs text-plum">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                正在生成 AI 解释…
              </div>
            )}

            {isEditing ? (
              <div className="mb-2">
                <textarea
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  placeholder="添加笔记..."
                  className="w-full h-20 bg-paper-2/80 border border-line rounded-lg p-2 text-xs text-ink placeholder:text-ink-4 focus:outline-none focus:border-line-strong resize-none"
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={handleCancelEdit}
                    className="p-1.5 rounded-lg hover:bg-paper-3 text-ink-3 hover:text-ink transition-colors"
                    disabled={saving}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="p-1.5 rounded-lg bg-ink hover:brightness-110 text-paper-2 transition-all disabled:opacity-50"
                    disabled={saving}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : annotation.comment ? (
              <p className="text-xs text-ink-2 bg-paper-2/60 rounded-lg p-2 mb-2">
                {annotation.comment}
              </p>
            ) : annotation.type !== 'highlight' ? (
              <button
                onClick={() => handleStartEdit(annotation)}
                className="w-full text-xs text-ocean bg-ocean/8 hover:bg-ocean/12 rounded-lg p-2 mb-2 border border-ocean/20 transition-colors"
              >
                + 点击添加笔记
              </button>
            ) : null}

            {isExpanded && !!annotation.aiSummary && (
              <div className="text-xs text-ink-2 bg-plum/8 rounded-lg p-3 mb-2 border border-plum/20">
                {(() => {
                  const aiSummary = annotation.aiSummary as {
                    coreIdea?: string;
                    relatedConcepts?: string;
                    whyItMatters?: string;
                    applications?: string;
                  };
                  return (
                    <>
                      {aiSummary.coreIdea && (
                        <div className="mb-2">
                          <span className="text-plum font-medium">核心概念:</span>
                          <p className="mt-1">{aiSummary.coreIdea}</p>
                        </div>
                      )}
                      {aiSummary.relatedConcepts && (
                        <div className="mb-2">
                          <span className="text-plum font-medium">相关概念:</span>
                          <p className="mt-1">{aiSummary.relatedConcepts}</p>
                        </div>
                      )}
                      {aiSummary.whyItMatters && (
                        <div className="mb-2">
                          <span className="text-plum font-medium">重要性:</span>
                          <p className="mt-1">{aiSummary.whyItMatters}</p>
                        </div>
                      )}
                      {aiSummary.applications && (
                        <div>
                          <span className="text-plum font-medium">应用场景:</span>
                          <p className="mt-1">{aiSummary.applications}</p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-4">
                {formatDate(annotation.createdAt)}
              </span>
              <div className="flex items-center gap-1">
                {!isEditing && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : annotation.id)}
                    className="p-1.5 rounded-lg hover:bg-paper-3 text-ink-3 hover:text-ink transition-colors"
                    title={isExpanded ? "收起" : "展开"}
                  >
                    <ArrowRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>
                )}
                {annotation.type !== 'highlight' && !isEditing && (
                  <button
                    onClick={() => handleStartEdit(annotation)}
                    className="p-1.5 rounded-lg hover:bg-paper-3 text-ink-3 hover:text-ink transition-colors"
                    title="编辑笔记"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => onDeleteAnnotation(annotation.id)}
                  className="p-1.5 rounded-lg hover:bg-coral/12 text-ink-3 hover:text-coral transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // AI 解释现按选区逐条挂到对应标注（不再共用一个全局槽位）。本 Tab 汇总所有
  // 已生成 AI 解释的标注 + 正在生成的那条，强制展开以直接看到解释内容。
  const renderAISummary = () => {
    const aiAnnotations = annotations.filter(
      (a) => a.aiSummary || a.id === explainingId,
    );
    if (aiAnnotations.length === 0) {
      return (
        <div className="text-center py-12 text-ink-4">
          <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">选中正文 → 点「AI 解释」</p>
          <p className="mt-1 text-xs">解释会作为一条标注留存，可逐条回看</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {aiAnnotations.map((a) => renderAnnotationCard(a, true))}
      </div>
    );
  };

  const renderResearchNotes = () => {
    return (
      <div className="space-y-3">
        <div className="rounded-xl p-4 bg-paper-2/60 border border-line">
          <textarea
            className="w-full h-64 bg-transparent text-ink text-sm resize-none focus:outline-none placeholder:text-ink-4"
            placeholder="在此添加研究笔记..."
            value={researchNotes}
            onChange={(event) => onResearchNotesChange(event.target.value)}
          />
        </div>

        {stickyNotes.length > 0 && (
          <div>
            <h4 className="overline mb-2 text-ink-3">📒 页面便签（{stickyNotes.length}）</h4>
            <div className="space-y-2">
              {stickyNotes.map((note) => (
                <div
                  key={note.id}
                  className="group rounded-xl p-3 bg-paper-2/60 border border-line hover:border-line-strong transition-all"
                >
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => onJumpToPage?.(note.page)}
                      className="text-xs px-2 py-0.5 rounded-full bg-sun/20 text-ink-2 hover:bg-sun/40 transition-colors flex-shrink-0"
                      title="跳转到该页"
                    >
                      第 {note.page + 1} 页
                    </button>
                    <p className="flex-1 min-w-0 text-xs text-ink-2 whitespace-pre-wrap break-words">
                      {note.content || <span className="text-ink-4">(空便签 — 在页面上点击 📒 编辑)</span>}
                    </p>
                    {onDeleteStickyNote && (
                      <button
                        onClick={() => onDeleteStickyNote(note.id)}
                        className="p-1 rounded-lg hover:bg-coral/12 text-ink-4 hover:text-coral transition-colors flex-shrink-0"
                        title="删除便签"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 text-[10px] text-ink-4">{formatDate(note.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const activeTabMeta = tabs.find((t) => t.id === activeTab);
  const tabCount = (id: TabType): number | null => {
    if (id === 'all') return annotations.length;
    if (id === 'ai' || id === 'notes') return null;
    return annotations.filter((a) => a.type === id).length;
  };

  return (
    <div className="w-80 h-full flex flex-col bg-paper/80 backdrop-blur-sm border-l border-line">
      {/* 紧凑图标 Tab 行：7 个全部铺满一行，不再挤压换行 */}
      <div className="flex items-stretch border-b border-line px-1.5 pt-1.5">
        {tabs.map((tab) => {
          const count = tabCount(tab.id);
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              aria-label={tab.label}
              className={`relative flex-1 flex items-center justify-center py-2.5 rounded-t-lg transition-all duration-200 ${
                isActive
                  ? 'text-ink bg-paper-2/70'
                  : 'text-ink-3 hover:text-ink hover:bg-paper-2/40'
              }`}
            >
              <tab.icon className="w-[18px] h-[18px]" />
              {count ? (
                <span className="ml-1 text-[10px] font-medium tabular-nums text-ink-3">
                  {count}
                </span>
              ) : null}
              {isActive && (
                <span className="absolute bottom-0 left-1.5 right-1.5 h-0.5 rounded-full bg-coral" />
              )}
            </button>
          );
        })}
      </div>

      {/* 当前 Tab 名称条：图标已足够紧凑，这里补回完整标签，保证功能可读 */}
      {activeTabMeta && (
        <div className="px-4 py-2 border-b border-line/60 flex items-center gap-2">
          <activeTabMeta.icon className="w-4 h-4 text-coral" />
          <span className="text-sm font-medium text-ink">{activeTabMeta.label}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeTab === 'ai' ? (
          renderAISummary()
        ) : activeTab === 'notes' ? (
          renderResearchNotes()
        ) : filteredAnnotations.length === 0 ? (
          <div className="text-center py-12 text-ink-4">
            <p className="text-sm">暂无{activeTab !== 'all' ? getAnnotationTypeLabel(activeTab as AnnotationType) : ''}标注</p>
          </div>
        ) : (
          filteredAnnotations.map((a) => renderAnnotationCard(a))
        )}
      </div>

      <div className="p-4 border-t border-line">
        <div className="flex items-center justify-between text-xs text-ink-3">
          <span>{annotations.length} 个标注</span>
          <span className="flex items-center gap-2">
            {annotations.filter((a) => a.type === 'highlight').length} <Highlighter className="w-3 h-3" style={{ color: ANNOTATION_COLORS.highlight }} />
            {annotations.filter((a) => a.type === 'insight').length} <Lightbulb className="w-3 h-3" style={{ color: ANNOTATION_COLORS.insight }} />
            {annotations.filter((a) => a.type === 'todo').length} <CheckSquare className="w-3 h-3" style={{ color: ANNOTATION_COLORS.todo }} />
            {annotations.filter((a) => a.type === 'transferable').length} <ArrowRight className="w-3 h-3" style={{ color: ANNOTATION_COLORS.transferable }} />
          </span>
        </div>
      </div>
    </div>
  );
}
