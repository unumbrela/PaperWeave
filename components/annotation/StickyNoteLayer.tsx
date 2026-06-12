'use client';

import { useRef, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import type { StickyNote } from '@/lib/db/types';

/** 拖动超过该距离（px）视为移动便签，否则视为点击打开编辑器 */
const DRAG_THRESHOLD = 5;

interface StickyNoteLayerProps {
  notes: StickyNote[];
  /** 0-based 页码（与 StickyNote.page 一致） */
  currentPage: number;
  scale: number;
  /** 贴便签模式：开启后点击页面任意位置新建一个 📒 */
  noteMode: boolean;
  onCreate: (x: number, y: number) => Promise<StickyNote | null>;
  onUpdate: (id: string, patch: Partial<Pick<StickyNote, 'x' | 'y' | 'content'>>) => void;
  onDelete: (id: string) => void;
}

/**
 * 页面便签层 —— 叠在 PDF 页面之上，渲染 📒 图标与弹出编辑器。
 * 坐标存储为 scale=1 的页面坐标（与 AnnotationLayer 同一约定），渲染时乘以 scale。
 */
export default function StickyNoteLayer({
  notes,
  currentPage,
  scale,
  noteMode,
  onCreate,
  onUpdate,
  onDelete,
}: StickyNoteLayerProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  // 拖动中的临时位置（unscaled 坐标），落定（pointerup）才持久化
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null);
  const dragRef = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const pageNotes = notes.filter((n) => n.page === currentPage);
  const openNote = openId ? pageNotes.find((n) => n.id === openId) : undefined;

  const handleLayerClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!noteMode) return;
    // 仅响应直接点在层上的点击（点在便签图标/编辑器上时不新建）
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    const created = await onCreate(x, y);
    if (created) {
      setOpenId(created.id);
      setDraft('');
    }
  };

  const handleIconPointerDown = (e: React.PointerEvent, note: StickyNote) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      id: note.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      originX: note.x,
      originY: note.y,
      moved: false,
    };
  };

  const handleIconPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startClientX;
    const dy = e.clientY - drag.startClientY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.moved = true;
    setDragPos({
      id: drag.id,
      x: Math.max(0, drag.originX + dx / scale),
      y: Math.max(0, drag.originY + dy / scale),
    });
  };

  const handleIconPointerUp = (e: React.PointerEvent, note: StickyNote) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.id !== note.id) return;
    if (drag.moved) {
      const dx = e.clientX - drag.startClientX;
      const dy = e.clientY - drag.startClientY;
      const x = Math.max(0, drag.originX + dx / scale);
      const y = Math.max(0, drag.originY + dy / scale);
      setDragPos(null);
      onUpdate(note.id, { x, y });
    } else {
      // 普通点击：打开/收起编辑器
      if (openId === note.id) {
        setOpenId(null);
      } else {
        setOpenId(note.id);
        setDraft(note.content);
      }
    }
  };

  const handleSave = () => {
    if (!openNote) return;
    if (draft !== openNote.content) onUpdate(openNote.id, { content: draft });
  };

  const handleDelete = () => {
    if (!openNote) return;
    onDelete(openNote.id);
    setOpenId(null);
  };

  const notePosition = (note: StickyNote) => {
    const pos = dragPos?.id === note.id ? dragPos : note;
    return { left: pos.x * scale, top: pos.y * scale };
  };

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 ${
        noteMode
          ? 'pointer-events-auto cursor-crosshair bg-sun/5 ring-2 ring-inset ring-sun/40 rounded-lg'
          : 'pointer-events-none'
      }`}
      onClick={handleLayerClick}
      style={{ zIndex: 10 }}
    >
      {pageNotes.map((note) => (
        <button
          key={note.id}
          className={`absolute pointer-events-auto select-none text-xl leading-none -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-125 ${
            dragPos?.id === note.id ? 'cursor-grabbing scale-125' : 'cursor-pointer'
          } ${openId === note.id ? 'scale-125 drop-shadow-md' : 'drop-shadow-sm'}`}
          style={{ ...notePosition(note), touchAction: 'none' }}
          title={note.content ? note.content.slice(0, 80) : '空便签（点击编辑，拖动移位）'}
          onPointerDown={(e) => handleIconPointerDown(e, note)}
          onPointerMove={handleIconPointerMove}
          onPointerUp={(e) => handleIconPointerUp(e, note)}
          onClick={(e) => e.stopPropagation()}
        >
          📒
        </button>
      ))}

      {openNote && (
        <div
          className="absolute pointer-events-auto w-64 rounded-xl border border-line bg-paper shadow-xl p-3"
          style={{
            left: (dragPos?.id === openNote.id ? dragPos.x : openNote.x) * scale + 16,
            top: (dragPos?.id === openNote.id ? dragPos.y : openNote.y) * scale + 8,
            zIndex: 20,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-ink-3">📒 第 {openNote.page + 1} 页便签</span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                className="p-1 rounded-lg hover:bg-coral/12 text-ink-3 hover:text-coral transition-colors"
                title="删除便签"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  handleSave();
                  setOpenId(null);
                }}
                className="p-1 rounded-lg hover:bg-paper-3 text-ink-3 hover:text-ink transition-colors"
                title="关闭"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleSave}
            placeholder="段落大意、名词解释、随手想法…"
            autoFocus
            className="w-full h-28 bg-paper-2/60 border border-line rounded-lg p-2 text-xs text-ink placeholder:text-ink-4 focus:outline-none focus:border-line-strong resize-none"
          />
          <p className="mt-1.5 text-[10px] text-ink-4">失焦自动保存 · 拖动 📒 可移动位置</p>
        </div>
      )}
    </div>
  );
}
