"use client";

import { useState } from "react";

export function BrunoFrame() {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="bruno-frame-fallback">
        <p>无法嵌入原站（可能被浏览器策略拦截）。</p>
        <a
          href="https://bruno-simon.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="bruno-fallback-cta"
        >
          在新标签页打开 bruno-simon.com ↗
        </a>
      </div>
    );
  }

  return (
    <div className="bruno-frame-wrap">
      {!loaded && (
        <div className="bruno-frame-loading">
          正在加载 bruno-simon.com · 建议用桌面端 + 耐心等 3–5 秒加载 3D 资源
        </div>
      )}
      <iframe
        src="https://bruno-simon.com/"
        title="Bruno Simon folio"
        className="bruno-frame"
        allow="fullscreen; autoplay"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
