"use client";

import { useEffect, useRef } from "react";

/**
 * Hero 签名底图层 —— 一张真实的羊皮纸 / 旧纸照片（public/hero-paper.jpg，
 * 公有领域），压在 hero 之后，叠一层纸白径向 + 垂直渐变「蒙版」保证标题清晰，
 * 底缘融进全站 paper 底色。两处动效：
 *   1. 缓慢 ken-burns 漂移（CSS，scale 1→1.06 往复）——让静态照片有呼吸感；
 *   2. 滚动视差（JS，rAF 节流，仅 transform）——底图比内容慢半拍。
 * 用户要换自己的图：替换 public/hero-paper.jpg 即可（无需改代码）。
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
