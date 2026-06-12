'use client';

import { useState, useCallback } from 'react';
import type { Annotation, AnnotationType, Rect, StickyNote } from '@/lib/db/types';
import { ANNOTATION_COLORS } from '@/lib/db/types';
import { repository } from '@/lib/db/repository';
import { userKeyHeaders } from '@/lib/ai/user-keys';

export { ANNOTATION_COLORS };

/**
 * 标注 hook —— 内部走本地 Dexie 仓储（单一真相源）。
 * 返回接口保持稳定，调用方（ViewerClient）无需改动。
 */
export function useAnnotations(paperId: string) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAnnotations = useCallback(async () => {
    if (!paperId) return;
    setLoading(true);
    try {
      const data = await repository.listAnnotations(paperId);
      setAnnotations(data);
    } catch (error) {
      console.error('获取标注失败:', error);
    } finally {
      setLoading(false);
    }
  }, [paperId]);

  const createAnnotation = useCallback(async (data: {
    page: number;
    rects: Rect[];
    selectedText?: string;
    type: AnnotationType;
    comment?: string;
  }) => {
    if (!paperId) return null;
    try {
      const created = await repository.createAnnotation({
        paperId,
        page: data.page,
        rects: data.rects,
        selectedText: data.selectedText,
        type: data.type,
        comment: data.comment,
        color: ANNOTATION_COLORS[data.type],
      });
      setAnnotations((prev) => [...prev, created]);
      return created;
    } catch (error) {
      console.error('[Annotations Hook] 创建标注失败:', error);
      return null;
    }
  }, [paperId]);

  const updateAnnotation = useCallback(async (id: string, data: {
    type?: AnnotationType;
    color?: string;
    comment?: string;
    aiSummary?: unknown;
  }) => {
    try {
      await repository.updateAnnotation(id, data);
      setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
      return true;
    } catch (error) {
      console.error('[Annotations Hook] 更新标注失败:', error);
      return false;
    }
  }, []);

  const deleteAnnotation = useCallback(async (id: string) => {
    try {
      await repository.deleteAnnotation(id);
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
      return true;
    } catch (error) {
      console.error('[Annotations Hook] 删除标注失败:', error);
      return false;
    }
  }, []);

  return {
    annotations,
    loading,
    fetchAnnotations,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
  };
}

/**
 * 页面便签 hook（📒）—— 内部走本地 Dexie 仓储（单一真相源）。
 */
export function useStickyNotes(paperId: string) {
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);

  const fetchStickyNotes = useCallback(async () => {
    if (!paperId) return;
    try {
      const data = await repository.listStickyNotes(paperId);
      setStickyNotes(data);
    } catch (error) {
      console.error('获取页面便签失败:', error);
    }
  }, [paperId]);

  const createStickyNote = useCallback(async (data: {
    page: number;
    x: number;
    y: number;
    content?: string;
  }) => {
    if (!paperId) return null;
    try {
      const created = await repository.createStickyNote({ paperId, ...data });
      setStickyNotes((prev) => [...prev, created]);
      return created;
    } catch (error) {
      console.error('[StickyNotes Hook] 创建便签失败:', error);
      return null;
    }
  }, [paperId]);

  const updateStickyNote = useCallback(async (id: string, patch: Partial<Pick<StickyNote, 'x' | 'y' | 'content'>>) => {
    try {
      await repository.updateStickyNote(id, patch);
      setStickyNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
      return true;
    } catch (error) {
      console.error('[StickyNotes Hook] 更新便签失败:', error);
      return false;
    }
  }, []);

  const deleteStickyNote = useCallback(async (id: string) => {
    try {
      await repository.deleteStickyNote(id);
      setStickyNotes((prev) => prev.filter((n) => n.id !== id));
      return true;
    } catch (error) {
      console.error('[StickyNotes Hook] 删除便签失败:', error);
      return false;
    }
  }, []);

  return {
    stickyNotes,
    fetchStickyNotes,
    createStickyNote,
    updateStickyNote,
    deleteStickyNote,
  };
}

/**
 * 研究笔记 hook —— 内部走本地 Dexie 仓储。
 */
export function useResearchNotes(paperId: string) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!paperId) return;
    try {
      const note = await repository.getNote(paperId);
      setNotes(note?.content || '');
    } catch (error) {
      console.error('获取笔记失败:', error);
    }
  }, [paperId]);

  const saveNotes = useCallback(async (content: string) => {
    if (!paperId) return;
    setSaving(true);
    try {
      await repository.saveNote(paperId, content);
      setNotes(content);
    } catch (error) {
      console.error('保存笔记失败:', error);
    } finally {
      setSaving(false);
    }
  }, [paperId]);

  return {
    notes,
    setNotes,
    saving,
    fetchNotes,
    saveNotes,
  };
}

/**
 * AI 解释 hook —— 仍走服务端 `/api/explain`（无状态 AI 助手，不涉及持久化）。
 */
export function useAIExplanation() {
  const [explanation, setExplanation] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const explain = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...userKeyHeaders() },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();
      if (data.success) {
        setExplanation(data.data);
        return data.data;
      }
    } catch (error) {
      console.error('AI 解释失败:', error);
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  const clear = useCallback(() => {
    setExplanation(null);
  }, []);

  return {
    explanation,
    loading,
    explain,
    clear,
  };
}
