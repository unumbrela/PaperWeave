'use client'

import React, { useCallback, useMemo } from 'react'
import { usePDFViewerStore } from '@/lib/store/pdfViewerStore'
import {
  Trash2,
  Clock,
  BookOpen,
  MessageSquare,
  StickyNote,
} from 'lucide-react'

export function NoteSidebar() {
  const {
    showAnnotations,
    showNotes,
    setShowAnnotations,
    setShowNotes,
    annotations,
    noteTitle,
    noteContent,
    setNoteTitle,
    setNoteContent,
    deleteAnnotation,
  } = usePDFViewerStore()

  // 按页面分组标注
  const annotationsByPage = useMemo(() => {
    const grouped: Record<number, typeof annotations> = {}
    annotations.forEach((anno) => {
      if (!grouped[anno.page]) {
        grouped[anno.page] = []
      }
      grouped[anno.page].push(anno)
    })
    return grouped
  }, [annotations])

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* 标签切换 */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => {
            setShowNotes(true)
            setShowAnnotations(false)
          }}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            showNotes
              ? 'text-blue-600 border-blue-600 bg-blue-50'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <StickyNote className="w-4 h-4" />
            笔记
          </div>
        </button>
        <button
          onClick={() => {
            setShowNotes(false)
            setShowAnnotations(true)
          }}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            showAnnotations
              ? 'text-blue-600 border-blue-600 bg-blue-50'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <MessageSquare className="w-4 h-4" />
            标注 ({annotations.length})
          </div>
        </button>
      </div>

      {/* 笔记面板 */}
      {showNotes && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="笔记标题..."
              className="w-full text-lg font-semibold text-gray-800 bg-transparent border-none focus:ring-0"
            />
          </div>
          <div className="flex-1 overflow-hidden p-4">
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="在这里写下你的笔记..."
              className="w-full h-full resize-none border-none focus:ring-0 text-gray-700 leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* 标注面板 */}
      {showAnnotations && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {Object.keys(annotationsByPage).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
                <BookOpen className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">还没有标注，开始阅读并添加标注吧！</p>
              </div>
            ) : (
              Object.entries(annotationsByPage)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([page, pageAnnos]) => (
                  <div key={page} className="border-b border-gray-100">
                    <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500">
                      第 {page} 页
                    </div>
                    <div className="divide-y divide-gray-100">
                      {pageAnnos.map((anno) => (
                        <div
                          key={anno.id}
                          className="p-4 hover:bg-gray-50 transition-colors group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor:
                                      anno.type === 'highlight'
                                        ? anno.color
                                          ? `${anno.color}33`
                                          : '#FFF9C4'
                                        : '#E3F2FD',
                                    color:
                                      anno.type === 'highlight'
                                        ? '#F57F17'
                                        : '#1565C0',
                                  }}
                                >
                                  {anno.type === 'highlight' && '高亮'}
                                  {anno.type === 'underline' && '下划线'}
                                  {anno.type === 'comment' && '评论'}
                                  {anno.type === 'note' && '笔记'}
                                  {anno.type === 'bookmark' && '书签'}
                                </span>
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(anno.createdAt).toLocaleTimeString()}
                                </span>
                              </div>

                              {anno.selectedText && (
                                <p className="text-sm text-gray-700 mb-2">
                                  "{anno.selectedText}"
                                </p>
                              )}

                              {anno.comment && (
                                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                  {anno.comment}
                                </p>
                              )}
                            </div>

                            <button
                              onClick={() => deleteAnnotation(anno.id)}
                              className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
