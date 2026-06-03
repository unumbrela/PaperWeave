import { create } from 'zustand'

// 标注数据类型
export interface Annotation {
  id: string
  page: number
  type: 'highlight' | 'underline' | 'comment' | 'note' | 'bookmark'
  content?: string
  color?: string
  rects: Array<{
    x1: number
    y1: number
    x2: number
    y2: number
    width: number
    height: number
  }>
  selectedText?: string
  comment?: string
  createdAt: Date
}

interface PDFViewerState {
  // 页码
  currentPage: number
  numPages: number
  setCurrentPage: (page: number) => void
  setNumPages: (numPages: number) => void
  
  // 缩放
  scale: number
  setScale: (scale: number) => void
  
  // 标注
  annotations: Annotation[]
  setAnnotations: (annotations: Annotation[]) => void
  addAnnotation: (annotation: Annotation) => void
  deleteAnnotation: (id: string) => void
  
  // 选择工具
  activeTool: 'select' | 'highlight' | 'underline' | 'comment' | 'bookmark'
  setActiveTool: (tool: 'select' | 'highlight' | 'underline' | 'comment' | 'bookmark') => void
  
  // 高亮颜色
  highlightColor: string
  setHighlightColor: (color: string) => void
  
  // 侧边栏状态
  showAnnotations: boolean
  showNotes: boolean
  setShowAnnotations: (show: boolean) => void
  setShowNotes: (show: boolean) => void
  
  // 笔记内容
  noteContent: string
  noteTitle: string
  setNoteContent: (content: string) => void
  setNoteTitle: (title: string) => void
}

export const usePDFViewerStore = create<PDFViewerState>((set) => ({
  // 页码
  currentPage: 1,
  numPages: 0,
  setCurrentPage: (page) => set({ currentPage: page }),
  setNumPages: (numPages) => set({ numPages }),
  
  // 缩放
  scale: 1.0,
  setScale: (scale) => set({ scale }),
  
  // 标注
  annotations: [],
  setAnnotations: (annotations) => set({ annotations }),
  addAnnotation: (annotation) => 
    set((state) => ({ annotations: [...state.annotations, annotation] })),
  deleteAnnotation: (id) =>
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
    })),
  
  // 选择工具
  activeTool: 'select',
  setActiveTool: (tool) => set({ activeTool: tool }),
  
  // 高亮颜色
  highlightColor: '#FFEB3B',
  setHighlightColor: (color) => set({ highlightColor: color }),
  
  // 侧边栏状态
  showAnnotations: false,
  showNotes: true,
  setShowAnnotations: (show) => set({ showAnnotations: show }),
  setShowNotes: (show) => set({ showNotes: show }),
  
  // 笔记内容
  noteContent: '',
  noteTitle: '我的笔记',
  setNoteContent: (content) => set({ noteContent: content }),
  setNoteTitle: (title) => set({ noteTitle: title }),
}))
