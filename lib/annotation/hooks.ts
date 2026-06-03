'use client';

import { useState, useCallback } from 'react';
import type { Annotation, AnnotationType } from '@prisma/client';

export const ANNOTATION_COLORS: Record<AnnotationType, string> = {
  highlight: '#F6E7B2',
  insight: '#CFE3FF',
  todo: '#DCCBFF',
  transferable: '#CBEFD8',
};

export function useAnnotations(paperId: string) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAnnotations = useCallback(async () => {
    if (!paperId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/annotations?paperId=${paperId}`);
      const data = await response.json();
      if (data.success) {
        setAnnotations(data.data);
      }
    } catch (error) {
      console.error('获取标注失败:', error);
    } finally {
      setLoading(false);
    }
  }, [paperId]);

  const createAnnotation = useCallback(async (data: {
    page: number;
    rects: Array<{ x: number; y: number; width: number; height: number }>;
    selectedText?: string;
    type: AnnotationType;
    comment?: string;
  }) => {
    if (!paperId) return null;
    
    const response = await fetch('/api/annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paperId,
        page: data.page,
        rects: data.rects,
        selectedText: data.selectedText,
        type: data.type,
        color: ANNOTATION_COLORS[data.type],
        comment: data.comment,
      }),
    });

    const result = await response.json();
    if (result.success) {
      console.log('[Annotations Hook] Annotation created:', result.data);
      setAnnotations(prev => [...prev, result.data]);
      return result.data;
    } else {
      console.error('[Annotations Hook] Failed to create annotation:', result.message);
    }
    return null;
  }, [paperId]);

  const updateAnnotation = useCallback(async (id: string, data: {
    type?: AnnotationType;
    color?: string;
    comment?: string;
    aiSummary?: any;
  }) => {
    const response = await fetch('/api/annotations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });

    const result = await response.json();
    if (result.success) {
      setAnnotations(prev => prev.map(a => a.id === id ? { ...a, ...result.data } : a));
      return result.data;
    }
    return null;
  }, []);

  const deleteAnnotation = useCallback(async (id: string) => {
    const response = await fetch(`/api/annotations?id=${id}`, { method: 'DELETE' });
    const result = await response.json();
    if (result.success) {
      setAnnotations(prev => prev.filter(a => a.id !== id));
      return true;
    }
    return false;
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

export function useResearchNotes(paperId: string) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!paperId) return;
    try {
      const response = await fetch(`/api/research-notes?paperId=${paperId}`);
      const data = await response.json();
      if (data.success && data.data.length > 0) {
        setNotes(data.data[0]?.content || '');
      }
    } catch (error) {
      console.error('获取笔记失败:', error);
    }
  }, [paperId]);

  const saveNotes = useCallback(async (content: string) => {
    if (!paperId) return;
    
    setSaving(true);
    try {
      let response = await fetch('/api/research-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId, content }),
      });
      
      if (!response.ok) {
        response = await fetch('/api/research-notes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: `note-${paperId}`, content }),
        });
      }
      
      const data = await response.json();
      if (data.success) {
        setNotes(content);
      }
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

export function useAIExplanation() {
  const [explanation, setExplanation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const explain = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
