"use client";

import { useEffect, useRef } from "react";

/**
 * Hero 签名底图层 —— 一张手工设计的「织线」插画（public/hero-art.webp：散落论文页
 * → 彩色丝线编织 → 装订书稿 → 折线图），作 hero 主视觉，叠一层轻量纸白蒙版：仅在
 * 左上标题区轻提亮、底缘渐隐进全站 paper，让插画清晰露出。两处动效：
 *   1. 轻微 ken-burns 漂移（CSS，scale 1→1.05 往复）——让静态插画有呼吸感；
 *   2. 滚动视差（JS，rAF 节流，仅 transform）——底图比内容慢半拍。
 * 换图：替换 public/hero-art.webp 即可（无需改代码；构图见 globals.css 的 .hero-* 注释）。
 * reduced-motion 下禁用视差与 ken-burns，仅保留静态底图 + 蒙版。
 */
export function HeroBackdrop() {
  const photoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = photoRef.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        // 视差：底图随滚动下移，幅度封顶（仅 hero 区域内有意义）。
        const shift = Math.min(y * 0.22, 180);
        el.style.setProperty("--parallax", `${shift}px`);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden className="hero-backdrop">
      <div ref={photoRef} className="hero-photo" />
      <div className="hero-scrim" />
    </div>
  );
}
