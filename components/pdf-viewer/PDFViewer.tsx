'use client'

import React, { useState, useEffect } from 'react'
import { Document, Page } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, MousePointer2, Highlighter, Underline, MessageSquare, Bookmark } from 'lucide-react'

import { pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

interface PDFViewerProps {
  file: string
  onError?: (error: Error) => void
}

export default function PDFViewer({ file, onError }: PDFViewerProps) {
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [activeTool, setActiveTool] = useState<'select' | 'highlight' | 'underline' | 'comment' | 'bookmark'>('select')

  const onDocumentLoadSuccess = ({ numPages: totalPages }: { numPages: number }) => {
    setNumPages(totalPages)
  }

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF加载失败:', error)
    onError?.(error)
  }

  const changePage = (offset: number) => {
    const newPage = currentPage + offset
    if (newPage >= 1 && newPage <= numPages) {
      setCurrentPage(newPage)
    }
  }

  const zoomIn = () => setScale(Math.min(scale + 0.2, 3.0))
  const zoomOut = () => setScale(Math.max(scale - 0.2, 0.5))
  const resetZoom = () => setScale(1.0)

  const tools = [
    { id: 'select', label: '选择', icon: MousePointer2 },
    { id: 'highlight', label: '高亮', icon: Highlighter },
    { id: 'underline', label: '下划线', icon: Underline },
    { id: 'comment', label: '评论', icon: MessageSquare },
    { id: 'bookmark', label: '书签', icon: Bookmark },
  ] as const

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 sticky top-0 z-10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* 页面导航 */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => changePage(-1)}
              disabled={currentPage <= 1}
              className="p-2 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5 text-gray-300" />
            </button>
            <span className="text-sm text-gray-400">
              第 {currentPage} 页 / 共 {numPages} 页
            </span>
            <button
              onClick={() => changePage(1)}
              disabled={currentPage >= numPages}
              className="p-2 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>
          </div>

          {/* 缩放控制 */}
          <div className="flex items-center gap-2">
            <button
              onClick={zoomOut}
              className="p-2 hover:bg-gray-700 rounded-lg"
            >
              <ZoomOut className="w-5 h-5 text-gray-300" />
            </button>
            <span className="text-sm text-gray-400 w-16 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="p-2 hover:bg-gray-700 rounded-lg"
            >
              <ZoomIn className="w-5 h-5 text-gray-300" />
            </button>
            <button
              onClick={resetZoom}
              className="p-2 hover:bg-gray-700 rounded-lg"
            >
              <RotateCcw className="w-5 h-5 text-gray-300" />
            </button>
          </div>

          {/* 标注工具 */}
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
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-700 text-gray-400'
                  }`}
                  title={tool.label}
                >
                  <Icon className="w-5 h-5" />
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* PDF内容 */}
      <div className="flex-1 overflow-auto bg-gray-900">
        <div className="p-8 flex justify-center">
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center h-96">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <Page
              pageNumber={currentPage}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        </div>
      </div>
    </div>
  )
}
