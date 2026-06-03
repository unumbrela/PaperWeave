'use client';

import { useState, useEffect, useRef } from 'react';
import { Highlighter, Lightbulb, CheckSquare, ArrowRight, Sparkles, Copy, X, Send } from 'lucide-react';
import type { AnnotationType } from '@/lib/db/types';

interface FloatingMenuProps {
  position: { x: number; y: number };
  selectedText: string;
  onSelect: (type: AnnotationType, text: string, comment?: string) => void;
  onAIExplain: (text: string) => void;
  onCopy: (text: string) => void;
  onClose: () => void;
}

const menuItems = [
  { type: 'highlight' as AnnotationType, icon: Highlighter, label: '高亮', color: '#F6E7B2', needsComment: false },
  { type: 'insight' as AnnotationType, icon: Lightbulb, label: '标记', color: '#CFE3FF', needsComment: true },
  { type: 'todo' as AnnotationType, icon: CheckSquare, label: 'Todo', color: '#DCCBFF', needsComment: true },
  { type: 'transferable' as AnnotationType, icon: ArrowRight, label: '可迁移', color: '#CBEFD8', needsComment: true },
];

export default function FloatingMenu({
  position,
  selectedText,
  onSelect,
  onAIExplain,
  onCopy,
  onClose,
}: FloatingMenuProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [currentItem, setCurrentItem] = useState<typeof menuItems[0] | null>(null);
  const [commentText, setCommentText] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showCommentInput) {
          setShowCommentInput(false);
          setCurrentItem(null);
          setCommentText('');
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, showCommentInput]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!showCommentInput) {
        setIsVisible(false);
        onClose();
      }
    }, 8000);

    return () => clearTimeout(timer);
  }, [onClose, showCommentInput]);

  useEffect(() => {
    if (showCommentInput && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [showCommentInput]);

  if (!isVisible) return null;

  const handleSelect = (item: typeof menuItems[0]) => {
    if (item.needsComment) {
      setCurrentItem(item);
      setShowCommentInput(true);
    } else {
      onSelect(item.type, selectedText);
      onClose();
    }
  };

  const handleConfirmWithComment = () => {
    console.log('[FloatingMenu] Confirming with comment:', {
      item: currentItem,
      comment: commentText,
      selectedText
    });
    if (currentItem) {
      onSelect(currentItem.type, selectedText, commentText || undefined);
      onClose();
    }
  };

  const handleCancelComment = () => {
    setShowCommentInput(false);
    setCurrentItem(null);
    setCommentText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleConfirmWithComment();
    }
  };

  const handleAIExplain = () => {
    console.log('[FloatingMenu] AI Explain for:', selectedText);
    onAIExplain(selectedText);
    onClose();
  };

  const handleCopy = () => {
    console.log('[FloatingMenu] Copy:', selectedText);
    onCopy(selectedText);
    onClose();
  };

  const displayText = selectedText.length > 100 ? selectedText.substring(0, 100) + '...' : selectedText;

  if (showCommentInput && currentItem) {
    return (
      <div
        ref={menuRef}
        className="fixed z-[9999] bg-gray-900/98 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-gray-700/50 w-80"
        style={{
          left: Math.min(Math.max(position.x, 100), window.innerWidth - 100),
          top: position.y,
          transform: 'translateY(-100%) translateY(-16px)',
          animation: 'fadeIn 0.15s ease-out',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${currentItem.color}25` }}
            >
              <currentItem.icon className="w-3.5 h-3.5" style={{ color: currentItem.color }} />
            </div>
            <span className="text-sm font-medium text-white">{currentItem.label}笔记</span>
          </div>
          <button
            onClick={handleCancelComment}
            className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="mb-3 p-2 bg-gray-800/60 rounded-lg text-xs text-gray-300 max-h-20 overflow-y-auto">
          {selectedText}
        </div>

        <textarea
          ref={textareaRef}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入笔记内容... (Ctrl+Enter 确认)"
          className="w-full h-24 bg-gray-800/80 border border-gray-700 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none"
        />

        <div className="flex gap-2 mt-3">
          <button
            onClick={handleCancelComment}
            className="flex-1 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirmWithComment}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-sm text-white transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>确认</span>
          </button>
        </div>

        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-100%) translateY(-24px);
            }
            to {
              opacity: 1;
              transform: translateY(-100%) translateY(-16px);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-gray-900/98 backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-gray-700/50"
      style={{
        left: Math.min(Math.max(position.x, 100), window.innerWidth - 100),
        top: position.y,
        transform: 'translateY(-100%) translateY(-16px)',
        animation: 'fadeIn 0.15s ease-out',
        minWidth: '200px',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div 
          className="text-xs text-gray-400 cursor-pointer hover:text-white transition-colors flex-1 truncate pr-2"
          onClick={() => setShowPreview(!showPreview)}
          title={selectedText}
        >
          {displayText}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {showPreview && (
        <div className="mb-3 p-2 bg-gray-800/80 rounded-lg text-xs text-gray-300 max-h-32 overflow-y-auto">
          {selectedText}
        </div>
      )}

      <div className="flex gap-1.5 mb-2">
        {menuItems.map((item) => (
          <button
            key={item.type}
            onClick={() => handleSelect(item)}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl hover:bg-gray-800/80 transition-all duration-150 group"
            title={item.label}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-150 group-hover:scale-110 relative"
              style={{ backgroundColor: `${item.color}25` }}
            >
              <item.icon className="w-4 h-4" style={{ color: item.color }} />
              {item.needsComment && (
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
              )}
            </div>
            <span className="text-[10px] text-gray-400 group-hover:text-gray-200">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="h-px bg-gray-800 my-2" />

      <div className="flex gap-1.5">
        <button
          onClick={handleAIExplain}
          className="flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl hover:bg-purple-500/10 transition-all duration-150 group"
          title="AI解释"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-purple-500/15 transition-transform duration-150 group-hover:scale-110">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-[10px] text-gray-400 group-hover:text-purple-300">AI解释</span>
        </button>

        <button
          onClick={handleCopy}
          className="flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl hover:bg-blue-500/10 transition-all duration-150 group"
          title="复制"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-500/15 transition-transform duration-150 group-hover:scale-110">
            <Copy className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-[10px] text-gray-400 group-hover:text-blue-300">复制</span>
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-100%) translateY(-24px);
          }
          to {
            opacity: 1;
            transform: translateY(-100%) translateY(-16px);
          }
        }
      `}</style>
    </div>
  );
}
