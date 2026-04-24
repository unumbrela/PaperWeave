"use client";

import "./beautiful-aurora-background.css";

/**
 * BeautifulAuroraBackground
 * Faithful port of the CodePen "The Aurora" demo
 * (reference_repos/aurora/index.html + style.css).
 *
 * The CSS lives in ./beautiful-aurora-background.css so that
 * mix-blend-mode composition is not disturbed by inline <style>
 * hydration timing, and so that blobs are NOT promoted to their
 * own compositor layer (no will-change / transform on them), which
 * would break mix-blend-mode in Chromium/Webkit.
 *
 * Used by:
 *   - app/tools/beautiful-aurora/page.tsx (standalone tool page)
 *   - components/beautifier/showcase.tsx  (drop-in background showcase)
 */
export function BeautifulAuroraBackground({
  className = "",
  title = "the beautiful aurora",
  speed = 1,
}: {
  className?: string;
  title?: string;
  speed?: number;
}) {
  const s = Math.max(0.1, speed);
  const style = {
    ["--aurora-border-duration" as string]: `${6 / s}s`,
    ["--aurora-track-1" as string]: `${12 / s}s`,
    ["--aurora-track-2" as string]: `${12 / s}s`,
    ["--aurora-track-3" as string]: `${8 / s}s`,
    ["--aurora-track-4" as string]: `${24 / s}s`,
  } as React.CSSProperties;

  return (
    <div
      className={`beautiful-aurora-root ${className}`.trim()}
      aria-hidden
      style={style}
    >
      <div className="beautiful-aurora-content">
        <h1 className="beautiful-aurora-title">
          {title}
          <span className="beautiful-aurora-overlay">
            <span className="beautiful-aurora-item beautiful-aurora-item-1" />
            <span className="beautiful-aurora-item beautiful-aurora-item-2" />
            <span className="beautiful-aurora-item beautiful-aurora-item-3" />
            <span className="beautiful-aurora-item beautiful-aurora-item-4" />
          </span>
        </h1>
      </div>
    </div>
  );
}
