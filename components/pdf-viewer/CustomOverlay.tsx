'use client'

import React, { useRef, useState, useEffect } from 'react'
import { usePDFViewerStore } from '@/lib/store/pdfViewerStore'

interface CustomOverlayProps {
  pageNumber: number
  scale: number
}

export function CustomOverlay({ pageNumber, scale }: CustomOverlayProps) {
  const {
    activeTool,
    highlightColor,
    addAnnotation,
    annotations
  } = usePDFViewerStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 })

  // 过滤当前页面的标注
  const pageAnnotations = annotations.filter((a) => a.page === pageNumber)

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'select') return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    setIsSelecting(true)
    setStartPoint({
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    })
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting) return
    
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const endPoint = {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    }

    // 计算矩形
    const x1 = Math.min(startPoint.x, endPoint.x)
    const y1 = Math.min(startPoint.y, endPoint.y)
    const x2 = Math.max(startPoint.x, endPoint.x)
    const y2 = Math.max(startPoint.y, endPoint.y)

    // 只有当选择区域有足够大小时才创建标注
    if (Math.abs(x2 - x1) > 10 && Math.abs(y2 - y1) > 10) {
      // 获取选择的文本
      let selectedText = ''
      try {
        const selection = window.getSelection()
        if (selection && selection.toString().trim()) {
          selectedText = selection.toString().trim()
        }
      } catch (err) {
        console.error('获取选择文本失败:', err)
      }

      const annotationType = activeTool as 'highlight' | 'underline' | 'comment' | 'bookmark'
      const newAnnotation = {
        id: Date.now().toString(),
        page: pageNumber,
        type: annotationType,
        color: highlightColor,
        rects: [{
          x1,
          y1,
          x2,
          y2,
          width: x2 - x1,
          height: y2 - y1,
        }],
        selectedText: selectedText || undefined,
        createdAt: new Date(),
      }

      addAnnotation(newAnnotation)
    }

    setIsSelecting(false)
  }

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      {/* 渲染已保存的标注 */}
      {pageAnnotations.map((annotation) => (
        <React.Fragment key={annotation.id}>
          {annotation.rects.map((rect, idx) => (
            <div
              key={`${annotation.id}-${idx}`}
              style={{
                position: 'absolute',
                left: rect.x1,
                top: rect.y1,
                width: rect.width,
                height: rect.height,
                backgroundColor:
                  annotation.type === 'highlight'
                    ? annotation.color || '#FFEB3B'
                    : 'transparent',
                borderBottom:
                  annotation.type === 'underline'
                    ? `2px solid ${annotation.color || '#F44336'}`
                    : 'none',
                opacity: 0.4,
                pointerEvents: 'auto',
                cursor: 'pointer',
              }}
              title={annotation.selectedText || '点击查看标注'}
            />
          ))}
        </React.Fragment>
      ))}
    </div>
  )
}
