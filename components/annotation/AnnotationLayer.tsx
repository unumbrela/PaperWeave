'use client';
import type { Annotation } from '@/lib/db/types';

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

    // 真实荧光笔效果：整条标注用一个 mix-blend-mode: multiply 的组容器，
    // 内部矩形为「不透明实色」。multiply 让高亮正片叠底、透出底下文字（可读）；
    // 由组容器整体只叠底一次，内部同色矩形的亚像素重叠不会累加变深，
    // 整条颜色均匀一致（消除「有深有浅」）。
    return (
      <div
        key={annotation.id}
        style={{ mixBlendMode: 'multiply' }}
        title={annotation.selectedText?.substring(0, 100)}
      >
        {rects.map((rect, index) => (
          <div
            key={`${annotation.id}-${index}`}
            className="absolute rounded-[2px]"
            style={{
              left: rect.x * scale,
              top: rect.y * scale,
              width: rect.width * scale,
              height: rect.height * scale,
              backgroundColor: annotation.color,
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
    >
      {pageAnnotations.map(renderAnnotation)}
    </div>
  );
}
