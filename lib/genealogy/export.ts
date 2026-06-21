/**
 * 研究方向族谱 —— 导出（纯函数 / 无副作用，可单测）。
 *
 *  - toMarkdown：缩进列表，贴进论文笔记即用（角色 / 关系 / 被引 / 核验 / 链接）。
 *  - toSvgString：用布局模型把整棵树画成自包含 <svg> 字符串；PNG 导出在浏览器侧
 *    把它喂给 Image → canvas → toBlob（见 components/genealogy/GenealogyControls.tsx），
 *    本模块只负责生成与坐标一致的矢量图，不碰 DOM。
 */

import type { Lineage } from "./lineage";
import {
  buildLayout,
  AXIS_W,
  CARD_DX,
  type GenealogyLayout,
} from "./layout";
import { ROLE_LABEL, ROLE_COLOR, RELATION_STYLE, PAPER } from "./theme";

/** XML 文本转义（标题/作者可能含 & < > " 等）。 */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/** 缩进 Markdown 族谱列表。 */
export function toMarkdown(lineage: Lineage): string {
  const layout = buildLayout(lineage);
  const verifiedTreeEdges = lineage.edges.filter(
    (e) => e.relation !== "parallel" && e.verified === "verified",
  ).length;
  const treeEdges = lineage.edges.filter((e) => e.relation !== "parallel").length;

  const lines: string[] = [];
  lines.push(`# 研究脉络族谱 · ${lineage.field}`);
  lines.push("");
  const years = lineage.nodes.map((n) => n.year);
  lines.push(
    `> ${lineage.nodes.length} 篇 · ${Math.min(...years)} → ${Math.max(...years)} · 引文核验 ${verifiedTreeEdges}/${treeEdges} 条边`,
  );
  lines.push("");

  for (const row of layout.rows) {
    const n = row.node;
    const indent = "  ".repeat(row.depth);
    const rel = row.relation ? `${RELATION_STYLE[row.relation].label} · ` : "";
    const mark =
      row.verified === true ? " ✓" : row.verified === false ? " ⚠" : "";
    const cite = typeof n.citations === "number" ? ` · 被引 ${n.citations}` : "";
    const role = `[${ROLE_LABEL[row.role]}]`;
    const link = n.url ? ` ([链接](${n.url}))` : "";
    lines.push(
      `${indent}- ${role} ${rel}**${esc(n.authors)}** (${n.year})${mark}${cite}${link}`,
    );
    lines.push(`${indent}  - 《${n.title}》`);
    if (n.problem || n.contribution) {
      const body = [n.problem, n.contribution].filter(Boolean).join(" ⇒ ");
      lines.push(`${indent}  - ${body}`);
    }
    if (row.parallels.length) {
      lines.push(`${indent}  - ∥ 并行：${row.parallels.join("、")}`);
    }
  }

  lines.push("");
  lines.push("---");
  lines.push("*由 PaperWeave · 研究脉络族谱导出。节点元数据来自 OpenAlex。*");
  return lines.join("\n");
}

const CARD_W = 560;
const PAD = 24;

/** 自包含 SVG 字符串：年份轴 + 泳道连线 + 节点 + 被引条 + 角色/核验徽标。 */
export function toSvgString(lineage: Lineage, layout?: GenealogyLayout): string {
  const L = layout ?? buildLayout(lineage);
  const contentX = AXIS_W + 8; // 内容区（连线+卡片）相对画布左边
  const W = contentX + L.width + CARD_DX + CARD_W + PAD;
  const headerH = 64;
  const H = headerH + L.height + PAD;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="ui-sans-serif, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif">`,
  );
  parts.push(`<rect width="${W}" height="${H}" fill="${PAPER.bg}"/>`);

  // 标题
  const years = lineage.nodes.map((n) => n.year);
  parts.push(
    `<text x="${PAD}" y="32" font-size="22" font-weight="600" fill="${PAPER.ink}">${esc(lineage.field)}</text>`,
  );
  parts.push(
    `<text x="${PAD}" y="52" font-size="12" fill="${PAPER.ink3}">${lineage.nodes.length} 篇 · ${Math.min(...years)} → ${Math.max(...years)}</text>`,
  );

  const g0 = `<g transform="translate(0 ${headerH})">`;
  parts.push(g0);

  // 时代隔行底色 + 年份轴
  for (let i = 0; i < L.eraBands.length; i++) {
    const b = L.eraBands[i];
    if (i % 2 === 1) {
      parts.push(
        `<rect x="0" y="${b.yStart}" width="${W}" height="${b.yEnd - b.yStart}" fill="${PAPER.band}"/>`,
      );
    }
    parts.push(
      `<text x="${AXIS_W - 12}" y="${b.yStart + 18}" text-anchor="end" font-size="12" font-weight="600" fill="${PAPER.ink3}">${b.year}</text>`,
    );
  }
  // 轴竖线
  parts.push(
    `<line x1="${AXIS_W}" y1="0" x2="${AXIS_W}" y2="${L.height}" stroke="${PAPER.line}" stroke-width="1"/>`,
  );

  // 主干连线（肘形：父 ↓ 到子 y → 子）
  const gx = (xy: { x: number; y: number }) => contentX + xy.x;
  for (const c of L.connectors) {
    const st = RELATION_STYLE[c.relation];
    const x1 = gx(c.from);
    const y1 = c.from.y;
    const x2 = gx(c.to);
    const y2 = c.to.y;
    const d = `M ${x1} ${y1} V ${y2} H ${x2}`;
    const dash = st.dash ? ` stroke-dasharray="${st.dash}"` : "";
    if (st.double) {
      parts.push(
        `<path d="M ${x1 - 1.5} ${y1} V ${y2} H ${x2}" fill="none" stroke="${st.color}" stroke-width="1"/>`,
      );
      parts.push(
        `<path d="M ${x1 + 1.5} ${y1} V ${y2} H ${x2}" fill="none" stroke="${st.color}" stroke-width="1"/>`,
      );
    } else {
      parts.push(
        `<path d="${d}" fill="none" stroke="${st.color}" stroke-width="1.4"${dash}/>`,
      );
    }
  }

  // parallel 横向点线
  for (const p of L.parallelLinks) {
    const st = RELATION_STYLE.parallel;
    parts.push(
      `<line x1="${gx(p.a)}" y1="${p.a.y}" x2="${gx(p.b)}" y2="${p.b.y}" stroke="${st.color}" stroke-width="1.2" stroke-dasharray="${st.dash}"/>`,
    );
  }

  // 节点
  for (const row of L.rows) {
    const n = row.node;
    const cx = gx(row.dot);
    const cy = row.dot.y;
    const color = ROLE_COLOR[row.role];
    // 圆点
    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="6" fill="${PAPER.bg}" stroke="${color}" stroke-width="2"/>`,
    );
    if (row.role === "founder" || row.role === "frontier") {
      parts.push(`<circle cx="${cx}" cy="${cy}" r="2.6" fill="${color}"/>`);
    }
    const tx = cx + CARD_DX;
    // 作者 (年份) + 核验标记
    const markColor = row.verified === true ? "#2e7d32" : "#b26a00";
    const markTspan =
      row.verified === true
        ? ` <tspan fill="${markColor}" font-weight="400">✓</tspan>`
        : row.verified === false
          ? ` <tspan fill="${markColor}" font-weight="400">⚠</tspan>`
          : "";
    parts.push(
      `<text x="${tx}" y="${cy - 4}" font-size="13" font-weight="600" fill="${PAPER.ink}">${esc(truncate(n.authors, 42))} <tspan fill="${PAPER.ink3}" font-weight="400">(${n.year})</tspan>${markTspan}</text>`,
    );
    // 标题
    parts.push(
      `<text x="${tx}" y="${cy + 12}" font-size="11" font-style="italic" fill="${PAPER.ink3}">${esc(truncate(n.title, 76))}</text>`,
    );
    // 被引迷你条
    const cites = n.citations ?? 0;
    const barW = 70;
    const w = Math.max(2, Math.round((barW * Math.sqrt(cites)) / Math.sqrt(L.maxCitations)));
    const bx = tx;
    const by = cy + 22;
    parts.push(
      `<rect x="${bx}" y="${by}" width="${barW}" height="4" rx="2" fill="${PAPER.line}"/>`,
    );
    parts.push(
      `<rect x="${bx}" y="${by}" width="${w}" height="4" rx="2" fill="${color}" opacity="0.55"/>`,
    );
    if (typeof n.citations === "number") {
      parts.push(
        `<text x="${bx + barW + 8}" y="${by + 4}" font-size="10" fill="${PAPER.ink4}">被引 ${n.citations}</text>`,
      );
    }
  }

  parts.push("</g>");
  parts.push("</svg>");
  return parts.join("\n");
}
