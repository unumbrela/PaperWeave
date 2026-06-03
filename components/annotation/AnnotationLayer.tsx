'use client';
import type { Annotation } from '@prisma/client';

interface AnnotationLayerProps {
  annotations: Annotation[];
  currentPage: number;
  scale: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function AnnotationLayer({
  annotations,
  currentPage,
  scale,
}: AnnotationLayerProps) {
  const pageAnnotations = annotations.filter((a) => a.page === currentPage);

  const renderAnnotation = (annotation: Annotation) => {
    const rects = annotation.rects as unknown as Rect[];
    
    if (!Array.isArray(rects)) return null;
    
    return rects.map((rect, index) => (
      <div
        key={`${annotation.id}-${index}`}
        className="absolute rounded-sm transition-all duration-200 hover:opacity-80 cursor-pointer"
        style={{
          left: rect.x * scale,
          top: rect.y * scale,
          width: rect.width * scale,
          height: rect.height * scale,
          backgroundColor: annotation.color,
          opacity: 0.6,
          boxShadow: `0 0 0 1px ${annotation.color}`,
        }}
        title={annotation.selectedText?.substring(0, 100)}
      />
    ));
  };

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
    >
      {pageAnnotations.map(renderAnnotation)}
    </div>
  );
}
