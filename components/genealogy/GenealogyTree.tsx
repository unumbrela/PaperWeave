"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Lineage, Relation } from "@/lib/genealogy/lineage";
import {
  buildLayout,
  relatives,
  AXIS_W,
  CARD_DX,
  ROW_H,
  type LayoutRow,
} from "@/lib/genealogy/layout";
import { ROLE_GLYPH, ROLE_COLOR, RELATION_STYLE } from "@/lib/genealogy/theme";

const CONTENT_X = AXIS_W + 8;
const CARD_W = 560;

export interface TreeFilter {
  relations: Set<Relation>;
  trunkOnly: boolean;
}

export function GenealogyTree({
  lineage,
  filter,
  selectedId,
  onSelect,
  jumpNonce,
}: {
  lineage: Lineage;
  filter: TreeFilter;
  selectedId?: string;
  onSelect: (row: LayoutRow) => void;
  /** 每次自增触发「跳到前沿」：滚动到首个 frontier 行并脉冲高亮 */
  jumpNonce?: number;
}) {
  const layout = useMemo(() => buildLayout(lineage), [lineage]);
  const kin = useMemo(() => relatives(lineage), [lineage]);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // 悬停时点亮整条「祖先 ∪ 自身 ∪ 后代」血缘
  const activeSet = useMemo(() => {
    if (!hoverId) return null;
    const k = kin.get(hoverId);
    const s = new Set<string>([hoverId]);
    k?.ancestors.forEach((id) => s.add(id));
    k?.descendants.forEach((id) => s.add(id));
    return s;
  }, [hoverId, kin]);

  const relShown = (r: Relation) =>
    filter.relations.has(r) && (!filter.trunkOnly || r === "builds-on");

  // 跳到前沿
  useEffect(() => {
    if (!jumpNonce) return;
    const target = layout.rows.find((r) => r.role === "frontier");
    if (!target) return;
    scrollRef.current?.scrollTo({
      top: Math.max(0, target.y - 40),
      behavior: "smooth",
    });
    // jumpNonce 是「跳到前沿」的一次性命令信号，脉冲高亮是其副作用
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPulseId(target.node.id);
    const t = setTimeout(() => setPulseId(null), 1400);
    return () => clearTimeout(t);
  }, [jumpNonce, layout.rows]);

  const containerW = CONTENT_X + layout.width + CARD_DX + CARD_W;
  const containerH = layout.height;

  const dim = (id: string) => activeSet !== null && !activeSet.has(id);
  const gx = (x: number) => CONTENT_X + x;

  return (
    <div
      ref={scrollRef}
      className="surface relative max-h-[78vh] overflow-auto rounded-[20px]"
    >
      <div className="relative" style={{ width: containerW, height: containerH }}>
        {/* 时代隔行底色 + 年份轴刻度 */}
        {layout.eraBands.map((b, i) => (
          <div key={`${b.year}-${b.yStart}`}>
            {i % 2 === 1 && (
              <div
                className="absolute left-0"
                style={{
                  top: b.yStart,
                  height: b.yEnd - b.yStart,
                  width: containerW,
                  background: "rgba(26, 23, 19, 0.022)",
                }}
              />
            )}
            <div
              className="serif absolute text-[13px] font-semibold text-ink-3"
              style={{ top: b.yStart + 12, left: 0, width: AXIS_W - 12, textAlign: "right" }}
            >
              {b.year}
            </div>
          </div>
        ))}
        {/* 年份轴竖线 */}
        <div
          className="absolute top-0"
          style={{ left: AXIS_W, height: containerH, width: 1, background: "var(--line)" }}
        />

        {/* 连线层（主干折线 + parallel 横连） */}
        <svg
          className="pointer-events-none absolute left-0 top-0"
          width={containerW}
          height={containerH}
        >
          {layout.connectors.map((c, i) => {
            if (!relShown(c.relation)) return null;
            const st = RELATION_STYLE[c.relation];
            const x1 = gx(c.from.x);
            const x2 = gx(c.to.x);
            const faded = activeSet !== null && !(activeSet.has(c.fromId) && activeSet.has(c.toId));
            const common = {
              fill: "none",
              stroke: st.color,
              strokeWidth: 1.5,
              strokeDasharray: st.dash,
              opacity: faded ? 0.12 : 0.85,
            } as const;
            if (st.double) {
              return (
                <g key={i} opacity={faded ? 0.15 : 1}>
                  <path d={`M ${x1 - 1.5} ${c.from.y} V ${c.to.y} H ${x2}`} fill="none" stroke={st.color} strokeWidth={1} />
                  <path d={`M ${x1 + 1.5} ${c.from.y} V ${c.to.y} H ${x2}`} fill="none" stroke={st.color} strokeWidth={1} />
                </g>
              );
            }
            return (
              <path key={i} d={`M ${x1} ${c.from.y} V ${c.to.y} H ${x2}`} {...common} />
            );
          })}
          {relShown("parallel") &&
            layout.parallelLinks.map((p, i) => {
              const st = RELATION_STYLE.parallel;
              const faded = activeSet !== null && !(activeSet.has(p.aId) && activeSet.has(p.bId));
              return (
                <line
                  key={`p${i}`}
                  x1={gx(p.a.x)}
                  y1={p.a.y}
                  x2={gx(p.b.x)}
                  y2={p.b.y}
                  stroke={st.color}
                  strokeWidth={1.4}
                  strokeDasharray={st.dash}
                  opacity={faded ? 0.1 : 0.7}
                />
              );
            })}
        </svg>

        {/* 节点卡片 */}
        {layout.rows.map((row) => (
          <NodeCard
            key={row.node.id}
            row={row}
            left={gx(row.dot.x) + CARD_DX}
            selected={selectedId === row.node.id}
            pulsing={pulseId === row.node.id}
            dimmed={dim(row.node.id)}
            maxCitations={layout.maxCitations}
            onHover={setHoverId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function NodeCard({
  row,
  left,
  selected,
  pulsing,
  dimmed,
  maxCitations,
  onHover,
  onSelect,
}: {
  row: LayoutRow;
  left: number;
  selected: boolean;
  pulsing: boolean;
  dimmed: boolean;
  maxCitations: number;
  onHover: (id: string | null) => void;
  onSelect: (row: LayoutRow) => void;
}) {
  const { node, role, relation, verified, parallels } = row;
  const color = ROLE_COLOR[role];
  const cites = node.citations ?? 0;
  const barPct = Math.max(4, Math.round((100 * Math.sqrt(cites)) / Math.sqrt(maxCitations)));

  return (
    <button
      type="button"
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(row)}
      className={cn(
        "group absolute flex flex-col gap-0.5 rounded-xl border px-3 py-2 text-left transition-all focus-ring",
        "bg-paper-2/70 hover:bg-paper-2",
        selected ? "border-line-strong" : "border-transparent hover:border-line",
        role === "frontier" && "ring-1 ring-[#b8860b]/35",
        pulsing && "ring-2 ring-[#b8860b] animate-pulse",
      )}
      style={{
        left,
        top: row.y + 8,
        width: CARD_W - 24,
        height: ROW_H - 16,
        opacity: dimmed ? 0.32 : 1,
      }}
    >
      <div className="flex items-baseline gap-1.5">
        <span style={{ color }} className="text-[13px] leading-none">
          {ROLE_GLYPH[role]}
        </span>
        {relation && (
          <span
            className="rounded px-1 py-px text-[9.5px] font-medium"
            style={{ color: RELATION_STYLE[relation].color, background: "rgba(26,23,19,0.04)" }}
          >
            {RELATION_STYLE[relation].label}
          </span>
        )}
        <span className="text-[13px] font-semibold text-ink">
          {node.authors} <span className="font-normal text-ink-3">({node.year})</span>
        </span>
        {verified === true && (
          <span className="text-[11px] text-[#2e7d32]" title="builds-on 边经引文核验">✓</span>
        )}
        {verified === false && (
          <span className="text-[11px] text-[#b26a00]" title="该边未经引文核验">⚠</span>
        )}
        {node.venue && <span className="truncate text-[10px] text-ink-4">{node.venue}</span>}
        {node.url && (
          <a
            href={node.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="ml-auto text-ink-4 opacity-0 transition-opacity group-hover:opacity-100 hover:text-ink"
            aria-label="打开论文链接"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <div className="truncate text-[11.5px] italic text-ink-3">“{node.title}”</div>
      <div className="flex items-center gap-2">
        <span className="h-[3px] w-[70px] overflow-hidden rounded-full" style={{ background: "rgba(26,23,19,0.10)" }}>
          <span className="block h-full rounded-full" style={{ width: `${barPct}%`, background: color, opacity: 0.55 }} />
        </span>
        {typeof node.citations === "number" && (
          <span className="text-[10px] text-ink-4">被引 {node.citations}</span>
        )}
        {parallels.length > 0 && (
          <span className="truncate text-[10px] text-ink-4">∥ {parallels.join("、")}</span>
        )}
      </div>
    </button>
  );
}
