"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ALGORITHMS } from "./algorithms/registry";
import s from "./shared/shared.module.css";

export function AlgorithmHub() {
  return (
    <div className={s.page}>
      <div className={s.container}>
        <Link href="/" className={s.backLink}>
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>返回 · THE COLLECTION</span>
        </Link>

        <header className={s.header}>
          <div className={s.headerTop}>
            <div>
              <div className={s.overline}>学习 · 工具</div>
              <h1 className={s.title}>
                <span className={s.titleIcon}>🌳 </span>算法可视化
              </h1>
              <p className={s.description}>
                交互式算法可视化集合 — 逐步动画 + C++ 代码高亮 +
                状态面板，直观理解经典数据结构与算法题。
              </p>
            </div>
          </div>
          <div className={s.hairline} />
        </header>

        <div className={s.hubGrid}>
          {ALGORITHMS.map((algo) => (
            <Link
              key={algo.slug}
              href={`/tools/algorithm-visualizer/${algo.slug}`}
              className={s.hubCard}
            >
              <span className={s.hubCardIcon}>{algo.icon}</span>
              <h2 className={s.hubCardTitle}>{algo.title}</h2>
              <p className={s.hubCardDesc}>{algo.description}</p>
              <div className={s.hubCardMeta}>
                <span className={s.hubCardTag}>{algo.difficulty}</span>
                {algo.tags.map((tag) => (
                  <span key={tag} className={s.hubCardTag}>
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
