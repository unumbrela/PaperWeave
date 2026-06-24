/**
 * 自包含的 draw.io(mxGraphModel) → SVG 渲染器。
 *
 * 为什么自己渲染：官方 viewer.diagrams.net 的静态查看器依赖外部 CDN 脚本，
 * 在国内网络常被墙/超时，导致预览永远卡在「加载中」。本渲染器只用浏览器内置
 * DOMParser 解析 mxCell，覆盖本工具提示词约束的常见形状（圆角矩形 / 矩形 /
 * 菱形 / 椭圆）与连线（直线/正交近似 + 箭头 + 标签），**零外部依赖**、随处可用。
 *
 * 复杂图（自定义 shape、泳道等）可能渲染不全 —— 因此 UI 仍保留「下载 .drawio /
 * 在 draw.io 打开」走官方编辑器拿到完整保真效果。
 */

interface Vertex {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  stroke: string;
  fontColor: string;
  rounded: boolean;
  dashed: boolean;
  shape: "rect" | "rhombus" | "ellipse";
  lines: string[];
}

interface Edge {
  source?: string;
  target?: string;
  stroke: string;
  fontColor: string;
  dashed: boolean;
  arrow: boolean;
  label: string;
}

export interface RenderedSvg {
  svg: string;
  width: number;
  height: number;
}

function parseStyle(s: string): Record<string, string> {
  const m: Record<string, string> = {};
  for (const part of s.split(";")) {
    if (!part) continue;
    const i = part.indexOf("=");
    if (i < 0) m[part] = "1";
    else m[part.slice(0, i)] = part.slice(i + 1);
  }
  return m;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** value（已被 DOMParser 解码）→ 多行纯文本：处理 <br>、换行，剥离其它 HTML 标签。 */
function toLines(value: string): string[] {
  const txt = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ");
  const lines = txt.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  return lines.length ? lines : [""];
}

function num(v: string | null, fallback: number): number {
  const n = v == null ? NaN : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

/** 沿「中心 → 目标点」方向求矩形边界上的交点，让连线从框边而非框心出发。 */
function borderPoint(v: Vertex, towardX: number, towardY: number) {
  const cx = v.x + v.w / 2;
  const cy = v.y + v.h / 2;
  const dx = towardX - cx;
  const dy = towardY - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const sx = dx !== 0 ? v.w / 2 / Math.abs(dx) : Infinity;
  const sy = dy !== 0 ? v.h / 2 / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s };
}

/**
 * 解析 mxfile/mxGraphModel XML，渲染为 SVG 字符串。解析失败或无节点时返回 null。
 * 仅在浏览器端调用（依赖 DOMParser）。
 */
export function renderMxToSvg(xml: string): RenderedSvg | null {
  if (typeof window === "undefined" || !xml) return null;
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(xml, "text/xml");
  } catch {
    return null;
  }
  if (doc.getElementsByTagName("parsererror").length) return null;

  const cells = Array.from(doc.getElementsByTagName("mxCell"));
  if (!cells.length) return null;

  const verts = new Map<string, Vertex>();
  const edges: Edge[] = [];

  for (const c of cells) {
    const id = c.getAttribute("id") || "";
    const style = parseStyle(c.getAttribute("style") || "");
    const geo = c.getElementsByTagName("mxGeometry")[0] || null;

    if (c.getAttribute("vertex") === "1") {
      if (!geo) continue;
      const shape: Vertex["shape"] = style.rhombus
        ? "rhombus"
        : style.ellipse || style.shape === "ellipse"
          ? "ellipse"
          : "rect";
      verts.set(id, {
        id,
        x: num(geo.getAttribute("x"), 0),
        y: num(geo.getAttribute("y"), 0),
        w: num(geo.getAttribute("width"), 120),
        h: num(geo.getAttribute("height"), 40),
        fill: style.fillColor && style.fillColor !== "none" ? style.fillColor : "#ffffff",
        stroke: style.strokeColor && style.strokeColor !== "none" ? style.strokeColor : "#6b7280",
        fontColor: style.fontColor || "#1f2430",
        rounded: style.rounded === "1" || style.shape === "rounded",
        dashed: style.dashed === "1",
        shape,
        lines: toLines(c.getAttribute("value") || ""),
      });
    } else if (c.getAttribute("edge") === "1") {
      edges.push({
        source: c.getAttribute("source") || undefined,
        target: c.getAttribute("target") || undefined,
        stroke: style.strokeColor && style.strokeColor !== "none" ? style.strokeColor : "#6b7280",
        fontColor: style.fontColor || "#5b6472",
        dashed: style.dashed === "1",
        arrow: style.endArrow !== "none",
        label: toLines(c.getAttribute("value") || "").join(" "),
      });
    }
  }

  const vlist = [...verts.values()];
  if (!vlist.length) return null;

  // 画布边界
  const pad = 24;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const v of vlist) {
    minX = Math.min(minX, v.x);
    minY = Math.min(minY, v.y);
    maxX = Math.max(maxX, v.x + v.w);
    maxY = Math.max(maxY, v.y + v.h);
  }
  const width = Math.max(1, maxX - minX + pad * 2);
  const height = Math.max(1, maxY - minY + pad * 2);
  const ox = pad - minX;
  const oy = pad - minY;

  const parts: string[] = [];

  // 连线（先画，压在节点下方）
  for (const e of edges) {
    if (!e.source || !e.target) continue;
    const s = verts.get(e.source);
    const t = verts.get(e.target);
    if (!s || !t) continue;
    const scx = s.x + s.w / 2,
      scy = s.y + s.h / 2;
    const tcx = t.x + t.w / 2,
      tcy = t.y + t.h / 2;
    const p1 = borderPoint(s, tcx, tcy);
    const p2 = borderPoint(t, scx, scy);
    const x1 = p1.x + ox,
      y1 = p1.y + oy,
      x2 = p2.x + ox,
      y2 = p2.y + oy;
    parts.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${esc(
        e.stroke,
      )}" stroke-width="1.4"${e.dashed ? ' stroke-dasharray="5 4"' : ""}${
        e.arrow ? ` marker-end="url(#arrow-${e.stroke.replace(/[^a-zA-Z0-9]/g, "")})"` : ""
      } />`,
    );
    if (e.label) {
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const lw = e.label.length * 6.2 + 8;
      parts.push(
        `<rect x="${(mx - lw / 2).toFixed(1)}" y="${(my - 9).toFixed(1)}" width="${lw.toFixed(
          1,
        )}" height="16" rx="3" fill="#ffffff" fill-opacity="0.9" />` +
          `<text x="${mx.toFixed(1)}" y="${(my + 3).toFixed(1)}" font-size="10" text-anchor="middle" fill="${esc(
            e.fontColor,
          )}" font-family="ui-sans-serif,system-ui,sans-serif">${esc(e.label)}</text>`,
      );
    }
  }

  // 节点
  for (const v of vlist) {
    const x = v.x + ox;
    const y = v.y + oy;
    const dash = v.dashed ? ' stroke-dasharray="5 4"' : "";
    if (v.shape === "rhombus") {
      const cx = x + v.w / 2,
        cy = y + v.h / 2;
      parts.push(
        `<polygon points="${cx},${y} ${x + v.w},${cy} ${cx},${y + v.h} ${x},${cy}" fill="${esc(
          v.fill,
        )}" stroke="${esc(v.stroke)}" stroke-width="1.4"${dash} />`,
      );
    } else if (v.shape === "ellipse") {
      parts.push(
        `<ellipse cx="${(x + v.w / 2).toFixed(1)}" cy="${(y + v.h / 2).toFixed(1)}" rx="${(v.w / 2).toFixed(
          1,
        )}" ry="${(v.h / 2).toFixed(1)}" fill="${esc(v.fill)}" stroke="${esc(v.stroke)}" stroke-width="1.4"${dash} />`,
      );
    } else {
      const r = v.rounded ? 8 : 0;
      parts.push(
        `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${v.w}" height="${v.h}" rx="${r}" fill="${esc(
          v.fill,
        )}" stroke="${esc(v.stroke)}" stroke-width="1.4"${dash} />`,
      );
    }
    // 文本（多行居中）
    const cx = x + v.w / 2;
    const lh = 13;
    const startY = y + v.h / 2 - ((v.lines.length - 1) * lh) / 2 + 4;
    v.lines.forEach((line, i) => {
      parts.push(
        `<text x="${cx.toFixed(1)}" y="${(startY + i * lh).toFixed(
          1,
        )}" font-size="11" text-anchor="middle" fill="${esc(
          v.fontColor,
        )}" font-family="ui-sans-serif,system-ui,sans-serif">${esc(line)}</text>`,
      );
    });
  }

  // 收集箭头颜色，生成 marker defs
  const arrowColors = new Set<string>();
  for (const e of edges) if (e.arrow && e.source && e.target) arrowColors.add(e.stroke);
  const defs = [...arrowColors]
    .map((c) => {
      const id = `arrow-${c.replace(/[^a-zA-Z0-9]/g, "")}`;
      return `<marker id="${id}" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,3 L0,6 Z" fill="${esc(
        c,
      )}" /></marker>`;
    })
    .join("");

  const body = parts.join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width.toFixed(0)} ${height.toFixed(
    0,
  )}" width="${width.toFixed(0)}" height="${height.toFixed(0)}" style="max-width:100%;height:auto"><defs>${defs}</defs>${body}</svg>`;

  return { svg, width, height };
}
