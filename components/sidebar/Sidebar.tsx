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
import type { Annotation, AnnotationType } from '@/lib/db/types';
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
  aiSummary: any;
  researchNotes: string;
  onDeleteAnnotation: (id: string) => void;
  onEditAnnotation: (id: string, comment: string) => Promise<void>;
  onAIExplain: (text: string) => void;
  onResearchNotesChange: (content: string) => void;
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
  aiSummary,
  researchNotes,
  onDeleteAnnotation,
  onEditAnnotation,
  onResearchNotesChange,
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

  const renderAnnotationCard = (annotation: Annotation) => {
    const isExpanded = expandedId === annotation.id;
    const isEditing = editingId === annotation.id;
    
    return (
      <div
        key={annotation.id}
        className="group rounded-xl p-4 bg-gray-800/50 border border-gray-700/30 hover:border-gray-600/50 transition-all duration-200"
      >
        <div className="flex items-start gap-3">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
            style={{ backgroundColor: annotation.color }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${annotation.color}30`, color: annotation.color }}>
                {getAnnotationTypeLabel(annotation.type)}
              </span>
              <span className="text-xs text-gray-500">
                第 {annotation.page + 1} 页
              </span>
            </div>
            
            <p className="text-sm text-gray-200 mb-2">
              {annotation.selectedText || '(无文本)'}
            </p>
            
            {isEditing ? (
              <div className="mb-2">
                <textarea
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  placeholder="添加笔记..."
                  className="w-full h-20 bg-gray-900/80 border border-gray-600 rounded-lg p-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={handleCancelEdit}
                    className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                    disabled={saving}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
                    disabled={saving}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : annotation.comment ? (
              <p className="text-xs text-gray-400 bg-gray-900/50 rounded-lg p-2 mb-2">
                {annotation.comment}
              </p>
            ) : annotation.type !== 'highlight' ? (
              <button
                onClick={() => handleStartEdit(annotation)}
                className="w-full text-xs text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg p-2 mb-2 border border-blue-500/20 transition-colors"
              >
                + 点击添加笔记
              </button>
            ) : null}
            
            {isExpanded && !!annotation.aiSummary && (
              <div className="text-xs text-gray-400 bg-purple-500/10 rounded-lg p-3 mb-2 border border-purple-500/20">
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
                          <span className="text-purple-400 font-medium">核心概念:</span>
                          <p className="mt-1">{aiSummary.coreIdea}</p>
                        </div>
                      )}
                      {aiSummary.relatedConcepts && (
                        <div className="mb-2">
                          <span className="text-purple-400 font-medium">相关概念:</span>
                          <p className="mt-1">{aiSummary.relatedConcepts}</p>
                        </div>
                      )}
                      {aiSummary.whyItMatters && (
                        <div className="mb-2">
                          <span className="text-purple-400 font-medium">重要性:</span>
                          <p className="mt-1">{aiSummary.whyItMatters}</p>
                        </div>
                      )}
                      {aiSummary.applications && (
                        <div>
                          <span className="text-purple-400 font-medium">应用场景:</span>
                          <p className="mt-1">{aiSummary.applications}</p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {formatDate(annotation.createdAt)}
              </span>
              <div className="flex items-center gap-1">
                {!isEditing && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : annotation.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                    title={isExpanded ? "收起" : "展开"}
                  >
                    <ArrowRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>
                )}
                {annotation.type !== 'highlight' && !isEditing && (
                  <button
                    onClick={() => handleStartEdit(annotation)}
                    className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                    title="编辑笔记"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => onDeleteAnnotation(annotation.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
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

  const renderAISummary = () => {
    if (!aiSummary) {
      return (
        <div className="text-center py-12 text-gray-500">
          <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">选择文本后点击 AI 解释</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {aiSummary.coreIdea && (
          <div className="rounded-xl p-4 bg-purple-500/10 border border-purple-500/20">
            <h4 className="text-sm font-medium text-purple-400 mb-2">核心概念</h4>
            <p className="text-sm text-gray-200">{aiSummary.coreIdea}</p>
          </div>
        )}
        {aiSummary.relatedConcepts && (
          <div className="rounded-xl p-4 bg-blue-500/10 border border-blue-500/20">
            <h4 className="text-sm font-medium text-blue-400 mb-2">相关概念</h4>
            <p className="text-sm text-gray-200">{aiSummary.relatedConcepts}</p>
          </div>
        )}
        {aiSummary.whyItMatters && (
          <div className="rounded-xl p-4 bg-green-500/10 border border-green-500/20">
            <h4 className="text-sm font-medium text-green-400 mb-2">为什么重要</h4>
            <p className="text-sm text-gray-200">{aiSummary.whyItMatters}</p>
          </div>
        )}
        {aiSummary.applications && (
          <div className="rounded-xl p-4 bg-yellow-500/10 border border-yellow-500/20">
            <h4 className="text-sm font-medium text-yellow-400 mb-2">潜在应用</h4>
            <p className="text-sm text-gray-200">{aiSummary.applications}</p>
          </div>
        )}
      </div>
    );
  };

  const renderResearchNotes = () => {
    return (
      <div className="rounded-xl p-4 bg-gray-800/50 border border-gray-700/30">
        <textarea
          className="w-full h-64 bg-transparent text-gray-200 text-sm resize-none focus:outline-none placeholder-gray-500"
          placeholder="在此添加研究笔记..."
          value={researchNotes}
          onChange={(event) => onResearchNotesChange(event.target.value)}
        />
      </div>
    );
  };

  return (
    <div className="w-80 h-full flex flex-col bg-gray-900/80 backdrop-blur-sm border-l border-gray-800">
      <div className="flex border-b border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 transition-all duration-200 ${
              activeTab === tab.id
                ? 'text-white border-b-2 border-blue-500 bg-blue-500/10'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-xs">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeTab === 'ai' ? (
          renderAISummary()
        ) : activeTab === 'notes' ? (
          renderResearchNotes()
        ) : filteredAnnotations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">暂无{activeTab !== 'all' ? getAnnotationTypeLabel(activeTab as AnnotationType) : ''}标注</p>
          </div>
        ) : (
          filteredAnnotations.map(renderAnnotationCard)
        )}
      </div>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center justify-between text-xs text-gray-500">
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
