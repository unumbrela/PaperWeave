'use client'

import React, { useState, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { usePDFViewerStore } from '@/lib/store/pdfViewerStore'
import { CustomOverlay } from './CustomOverlay'
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  List,
  StickyNote,
  Highlighter,
  Underline,
  MessageSquare,
  Bookmark,
  MousePointer2
} from 'lucide-react'

// 设置PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfContainerProps {
  pdfUrl: string
}

export function PdfContainer({ pdfUrl }: PdfContainerProps) {
  const { 
    currentPage, 
    numPages, 
    scale,
    setCurrentPage, 
    setNumPages,
    setScale,
    activeTool,
    setActiveTool,
    highlightColor,
    setHighlightColor
  } = usePDFViewerStore()
  
  const [fileError, setFileError] = useState<string | null>(null)

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages)
    },
    [setNumPages]
  )

  const onDocumentLoadError = useCallback(
    (error: Error) => {
      console.error('PDF加载失败:', error)
      setFileError('PDF加载失败，请检查文件是否有效')
    },
    []
  )

  const changePage = useCallback(
    (offset: number) => {
      const newPage = currentPage + offset
      if (newPage >= 1 && newPage <= numPages) {
        setCurrentPage(newPage)
      }
    },
    [currentPage, numPages, setCurrentPage]
  )

  const zoomIn = () => setScale(Math.min(scale + 0.2, 3.0))
  const zoomOut = () => setScale(Math.max(scale - 0.2, 0.5))
  const resetZoom = () => setScale(1.0)

  const COLORS = [
    '#FFEB3B', // 黄色
    '#4CAF50', // 绿色
    '#2196F3', // 蓝色
    '#F44336', // 红色
    '#FF9800', // 橙色
    '#9C27B0', // 紫色
  ]

  const tools = [
    { id: 'select', label: '选择', icon: MousePointer2 },
    { id: 'highlight', label: '高亮', icon: Highlighter },
    { id: 'underline', label: '下划线', icon: Underline },
    { id: 'comment', label: '评论', icon: MessageSquare },
    { id: 'bookmark', label: '书签', icon: Bookmark },
  ] as const

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 工具栏 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* 左侧：页面导航 */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => changePage(-1)}
              disabled={currentPage <= 1}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-700">
              第 {currentPage} 页 / 共 {numPages} 页
            </span>
            <button
              onClick={() => changePage(1)}
              disabled={currentPage >= numPages}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* 中间：缩放控制 */}
          <div className="flex items-center gap-2">
            <button
              onClick={zoomOut}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-700 w-16 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={resetZoom}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          {/* 右侧：标注工具 */}
          <div className="flex items-center gap-1">
            {tools.map((tool) => {
              const Icon = tool.icon
              const isActive = activeTool === tool.id
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title={tool.label}
                >
                  <Icon className="w-5 h-5" />
                </button>
              )
            })}

            {/* 颜色选择器 */}
            {activeTool === 'highlight' && (
              <div className="flex items-center gap-1 ml-2 pl-2 border-l">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setHighlightColor(color)}
                    className={`w-6 h-6 rounded-full border-2 ${
                      highlightColor === color ? 'border-gray-800 scale-110' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PDF内容区域 */}
      <div className="flex-1 overflow-auto p-8 flex justify-center">
        {fileError ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-red-500 mb-4">
              <FileErrorIcon className="w-16 h-16 mx-auto" />
            </div>
            <p className="text-gray-700">{fileError}</p>
          </div>
        ) : (
          <div className="relative shadow-lg">
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center h-96">
                  <div className="text-gray-500">正在加载 PDF...</div>
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
              {/* 自定义覆盖层 - 用于标注 */}
              <CustomOverlay pageNumber={currentPage} scale={scale} />
            </Document>
          </div>
        )}
      </div>
    </div>
  )
}

// 简单的错误图标组件
function FileErrorIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="12" y1="22" x2="12.01" y2="22" />
    </svg>
  )
}
