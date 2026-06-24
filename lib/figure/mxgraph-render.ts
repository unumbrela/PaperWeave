/**
 * 自包含的 draw.io(mxGraphModel) → SVG 渲染器。
 *
 * 为什么自己渲染：官方 viewer.diagrams.net 的静态查看器依赖外部 CDN 脚本，
 * 在国内网络常被墙/超时，导致预览永远卡在「加载中」。本渲染器只用浏览器内置
 * DOMParser 解析 mxCell，覆盖本工具提示词约束的常见形状（圆角矩形 / 矩形 /
 * 菱形 / 椭圆 / 泳道容器）与连线（直线/正交近似 + 箭头 + 标签），**零外部依赖**。
 *
 * 关键：mxGraph 的子节点几何是**相对父节点原点**的（容器/泳道场景）。必须沿
 * parent 链把坐标累加成绝对坐标，否则容器子节点会全部坍缩到原点、互相重叠、
 * 结构错乱（这正是「预览与 draw.io 不一致」的根因）。
 *
 * 复杂图（自定义 shape、波折点等）仍可能渲染不全 —— 因此 UI 保留「下载 .drawio /
 * 在 draw.io 打开」走官方编辑器拿到完整保真效果。
 */

interface RawCell {
  id: string;
  parent: string;
  isVertex: boolean;
  isEdge: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  style: Record<string, string>;
  value: string;
  source?: string;
  target?: string;
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

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 沿「中心 → 目标点」方向求矩形边界上的交点，让连线从框边而非框心出发。 */
function borderPoint(b: Box, towardX: number, towardY: number) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const dx = towardX - cx;
  const dy = towardY - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const sx = dx !== 0 ? b.w / 2 / Math.abs(dx) : Infinity;
  const sy = dy !== 0 ? b.h / 2 / Math.abs(dy) : Infinity;
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

  const cellEls = Array.from(doc.getElementsByTagName("mxCell"));
  if (!cellEls.length) return null;

  const byId = new Map<string, RawCell>();
  for (const c of cellEls) {
    const id = c.getAttribute("id") || "";
    if (!id) continue;
    const geo = c.getElementsByTagName("mxGeometry")[0] || null;
    byId.set(id, {
      id,
      parent: c.getAttribute("parent") || "",
      isVertex: c.getAttribute("vertex") === "1",
      isEdge: c.getAttribute("edge") === "1",
      x: geo ? num(geo.getAttribute("x"), 0) : 0,
      y: geo ? num(geo.getAttribute("y"), 0) : 0,
      w: geo ? num(geo.getAttribute("width"), 120) : 120,
      h: geo ? num(geo.getAttribute("height"), 40) : 40,
      style: parseStyle(c.getAttribute("style") || ""),
      value: c.getAttribute("value") || "",
      source: c.getAttribute("source") || undefined,
      target: c.getAttribute("target") || undefined,
    });
  }

  // 子节点几何相对父节点原点 → 沿 parent 链累加成绝对坐标（带记忆化防环）
  const absCache = new Map<string, { x: number; y: number }>();
  const resolving = new Set<string>();
  function absPos(id: string): { x: number; y: number } {
    const cached = absCache.get(id);
    if (cached) return cached;
    const c = byId.get(id);
    if (!c) return { x: 0, y: 0 };
    let pos = { x: c.x, y: c.y };
    const p = c.parent ? byId.get(c.parent) : undefined;
    if (p && p.isVertex && !resolving.has(id)) {
      resolving.add(id);
      const pa = absPos(c.parent);
      resolving.delete(id);
      pos = { x: pa.x + c.x, y: pa.y + c.y };
    }
    absCache.set(id, pos);
    return pos;
  }

  function depth(id: string): number {
    let d = 0;
    let cur = byId.get(id);
    const seen = new Set<string>();
    while (cur && cur.parent && byId.get(cur.parent)?.isVertex && !seen.has(cur.id)) {
      seen.add(cur.id);
      d++;
      cur = byId.get(cur.parent);
    }
    return d;
  }

  const vertices = [...byId.values()].filter((c) => c.isVertex);
  const edges = [...byId.values()].filter((c) => c.isEdge);
  if (!vertices.length) return null;

  // 是否为容器：样式声明，或有子顶点
  const hasChild = new Set<string>();
  for (const v of vertices) {
    const p = byId.get(v.parent);
    if (p && p.isVertex) hasChild.add(p.id);
  }
  const isContainer = (c: RawCell) =>
    hasChild.has(c.id) ||
    !!c.style.swimlane ||
    !!c.style.group ||
    c.style.container === "1" ||
    c.style.childLayout != null;

  // 绝对盒
  const boxOf = (c: RawCell): Box => {
    const p = absPos(c.id);
    return { x: p.x, y: p.y, w: c.w, h: c.h };
  };

  // 画布边界（含所有顶点的绝对盒）
  const pad = 24;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const v of vertices) {
    const b = boxOf(v);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  if (!Number.isFinite(minX)) return null;
  const width = Math.max(1, maxX - minX + pad * 2);
  const height = Math.max(1, maxY - minY + pad * 2);
  const ox = pad - minX;
  const oy = pad - minY;

  const shapes: string[] = [];
  const edgeParts: string[] = [];
  const labels: string[] = [];
  const arrowColors = new Set<string>();

  // 顶点形状：外层容器先画（depth 升序），子节点叠在上方
  const sorted = [...vertices].sort((a, b) => depth(a.id) - depth(b.id));
  for (const v of sorted) {
    const b = boxOf(v);
    const x = b.x + ox;
    const y = b.y + oy;
    const st = v.style;
    const container = isContainer(v);
    const fill = st.fillColor && st.fillColor !== "none" ? st.fillColor : container ? "#fbfbfb" : "#ffffff";
    const stroke = st.strokeColor && st.strokeColor !== "none" ? st.strokeColor : "#6b7280";
    const fontColor = st.fontColor || "#1f2430";
    const dash = st.dashed === "1" ? ' stroke-dasharray="5 4"' : "";
    const shape = st.rhombus ? "rhombus" : st.ellipse || st.shape === "ellipse" ? "ellipse" : "rect";
    const fillOpacity = container ? ' fill-opacity="0.55"' : "";

    if (shape === "rhombus") {
      const cx = x + b.w / 2;
      const cy = y + b.h / 2;
      shapes.push(
        `<polygon points="${cx},${y} ${x + b.w},${cy} ${cx},${y + b.h} ${x},${cy}" fill="${esc(
          fill,
        )}" stroke="${esc(stroke)}" stroke-width="1.4"${dash} />`,
      );
    } else if (shape === "ellipse") {
      shapes.push(
        `<ellipse cx="${(x + b.w / 2).toFixed(1)}" cy="${(y + b.h / 2).toFixed(1)}" rx="${(b.w / 2).toFixed(
          1,
        )}" ry="${(b.h / 2).toFixed(1)}" fill="${esc(fill)}" stroke="${esc(stroke)}" stroke-width="1.4"${dash} />`,
      );
    } else {
      const r = st.rounded === "1" || st.shape === "rounded" ? 8 : 0;
      shapes.push(
        `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${b.w}" height="${b.h}" rx="${r}" fill="${esc(
          fill,
        )}"${fillOpacity} stroke="${esc(stroke)}" stroke-width="1.4"${dash} />`,
      );
    }

    // 文本：容器标签贴顶（标题栏），普通节点居中
    const lines = toLines(v.value);
    if (lines.length === 1 && lines[0] === "") continue;
    const cx = x + b.w / 2;
    if (container) {
      const startSize = num(st.startSize ?? null, 26);
      const ty = y + Math.min(startSize, b.h) / 2 + 4;
      labels.push(
        `<text x="${cx.toFixed(1)}" y="${ty.toFixed(1)}" font-size="11" font-weight="600" text-anchor="middle" fill="${esc(
          fontColor,
        )}" font-family="ui-sans-serif,system-ui,sans-serif">${esc(lines.join(" "))}</text>`,
      );
    } else {
      const lh = 13;
      const startY = y + b.h / 2 - ((lines.length - 1) * lh) / 2 + 4;
      lines.forEach((line, i) => {
        labels.push(
          `<text x="${cx.toFixed(1)}" y="${(startY + i * lh).toFixed(
            1,
          )}" font-size="11" text-anchor="middle" fill="${esc(
            fontColor,
          )}" font-family="ui-sans-serif,system-ui,sans-serif">${esc(line)}</text>`,
        );
      });
    }
  }

  // 连线（叠在节点之上）
  for (const e of edges) {
    if (!e.source || !e.target) continue;
    const s = byId.get(e.source);
    const t = byId.get(e.target);
    if (!s || !t || !s.isVertex || !t.isVertex) continue;
    const sb = boxOf(s);
    const tb = boxOf(t);
    const scx = sb.x + sb.w / 2,
      scy = sb.y + sb.h / 2;
    const tcx = tb.x + tb.w / 2,
      tcy = tb.y + tb.h / 2;
    const p1 = borderPoint(sb, tcx, tcy);
    const p2 = borderPoint(tb, scx, scy);
    const x1 = p1.x + ox,
      y1 = p1.y + oy,
      x2 = p2.x + ox,
      y2 = p2.y + oy;
    const stroke = e.style.strokeColor && e.style.strokeColor !== "none" ? e.style.strokeColor : "#6b7280";
    const arrow = e.style.endArrow !== "none";
    const dash = e.style.dashed === "1" ? ' stroke-dasharray="5 4"' : "";
    if (arrow) arrowColors.add(stroke);
    edgeParts.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(
        1,
      )}" stroke="${esc(stroke)}" stroke-width="1.4"${dash}${
        arrow ? ` marker-end="url(#arr-${stroke.replace(/[^a-zA-Z0-9]/g, "")})"` : ""
      } />`,
    );
    const label = toLines(e.value).join(" ");
    if (label) {
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const lw = label.length * 6.2 + 8;
      const fc = e.style.fontColor || "#5b6472";
      edgeParts.push(
        `<rect x="${(mx - lw / 2).toFixed(1)}" y="${(my - 9).toFixed(1)}" width="${lw.toFixed(
          1,
        )}" height="16" rx="3" fill="#ffffff" fill-opacity="0.92" /><text x="${mx.toFixed(1)}" y="${(
          my + 3
        ).toFixed(1)}" font-size="10" text-anchor="middle" fill="${esc(
          fc,
        )}" font-family="ui-sans-serif,system-ui,sans-serif">${esc(label)}</text>`,
      );
    }
  }

  const defs = [...arrowColors]
    .map((c) => {
      const id = `arr-${c.replace(/[^a-zA-Z0-9]/g, "")}`;
      return `<marker id="${id}" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,3 L0,6 Z" fill="${esc(
        c,
      )}" /></marker>`;
    })
    .join("");

  // 叠放顺序：形状 → 连线 → 文字（文字始终最上、可读）
  const body = shapes.join("") + edgeParts.join("") + labels.join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width.toFixed(0)} ${height.toFixed(
    0,
  )}" width="${width.toFixed(0)}" height="${height.toFixed(
    0,
  )}" style="max-width:100%;height:auto">${defs ? `<defs>${defs}</defs>` : ""}${body}</svg>`;

  return { svg, width, height };
}
