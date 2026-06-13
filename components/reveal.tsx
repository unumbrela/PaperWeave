"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/lib/utils";

/**
 * 滚动触发动画原语。元素进入视口时加 `.is-revealed`，配合 globals.css 里的
 * `.reveal` 基类完成淡入 + 上浮。共享一个 IntersectionObserver（按需创建），
 * 避免每个元素各起一个 observer。
 *
 * - `delay`：进入视口后延迟触发的毫秒数（用于同屏元素 stagger）。
 * - `prefers-reduced-motion` 下不挂 observer，直接渲染为可见。
 */

type RevealProps = {
  as?: ElementType;
  delay?: number;
  /** 默认只触发一次；设 false 则离开视口后可重复触发。 */
  once?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

let sharedObserver: IntersectionObserver | null = null;
const callbacks = new WeakMap<Element, (visible: boolean) => void>();

function getObserver(): IntersectionObserver | null {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) return null;
  if (sharedObserver) return sharedObserver;
  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        callbacks.get(entry.target)?.(entry.isIntersecting);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );
  return sharedObserver;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

export function Reveal({
  as = "div",
  delay = 0,
  once = true,
  className,
  style,
  children,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  // 默认按「未揭示」渲染；reduced-motion / 无 observer 时初始即可见。
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 立即可见的两条短路（reduced-motion / 无 IO 支持）属于一次性同步设值，
    // 不是级联渲染，沿用仓库既有的局部禁用约定。
    /* eslint-disable react-hooks/set-state-in-effect */
    if (prefersReducedMotion()) {
      setRevealed(true);
      return;
    }
    const observer = getObserver();
    if (!observer) {
      setRevealed(true);
      return;
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    let timer: ReturnType<typeof setTimeout> | undefined;
    callbacks.set(el, (visible) => {
      if (visible) {
        timer = setTimeout(() => setRevealed(true), delay);
        if (once) {
          observer.unobserve(el);
          callbacks.delete(el);
        }
      } else if (!once) {
        if (timer) clearTimeout(timer);
        setRevealed(false);
      }
    });
    observer.observe(el);
    return () => {
      if (timer) clearTimeout(timer);
      observer.unobserve(el);
      callbacks.delete(el);
    };
  }, [delay, once]);

  const Tag = as as React.ComponentType<{
    ref?: Ref<HTMLElement>;
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
  }>;

  return (
    <Tag
      ref={ref}
      className={cn("reveal", revealed && "is-revealed", className)}
      style={style}
    >
      {children}
    </Tag>
  );
}
