"use client";

import { useEffect, useState } from "react";

type Anchor = {
  id: string;
  label: string;
  note: string;
};

const ANCHORS: Anchor[] = [
  {
    id: "hpi-anchor-hero",
    label: "01 · Starfield Hero",
    note: "Three.js 粒子把 iGEM Registry 的 DNA 嵌入映射到 3D 空间，相机距离推进时文案三段式切换。",
  },
  {
    id: "hpi-article-anchor",
    label: "02 · 中文解读",
    note: "往下滚查看：这个项目是什么、首页在讲什么故事、技术上做对了什么。",
  },
];

export function Commentary() {
  const [activeId, setActiveId] = useState<string>(ANCHORS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      {
        rootMargin: "-30% 0px -50% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    ANCHORS.forEach((a) => {
      const el = document.getElementById(a.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <aside className="hpi-commentary">
      <div className="hpi-commentary-title">解读 · Commentary</div>
      <ol className="hpi-commentary-list">
        {ANCHORS.map((a) => (
          <li
            key={a.id}
            className={
              "hpi-commentary-item" + (activeId === a.id ? " active" : "")
            }
          >
            <button
              onClick={() =>
                document
                  .getElementById(a.id)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className="hpi-commentary-label"
            >
              {a.label}
            </button>
            <p className="hpi-commentary-note">{a.note}</p>
          </li>
        ))}
      </ol>
    </aside>
  );
}
