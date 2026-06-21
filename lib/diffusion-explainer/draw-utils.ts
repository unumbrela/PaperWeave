import type { Vec2 } from "./types";
import { DOMAIN_MAX, DOMAIN_MIN } from "./config";

const SPAN = DOMAIN_MAX - DOMAIN_MIN;

/** 数据坐标 → 画布像素（y 轴朝上）。 */
export function dataToPx(p: Vec2, w: number, h: number): Vec2 {
  return [((p[0] - DOMAIN_MIN) / SPAN) * w, (1 - (p[1] - DOMAIN_MIN) / SPAN) * h];
}

/** 画布像素 → 数据坐标。 */
export function pxToData(px: Vec2, w: number, h: number): Vec2 {
  return [(px[0] / w) * SPAN + DOMAIN_MIN, (1 - px[1] / h) * SPAN + DOMAIN_MIN];
}

export function clearCanvas(ctx: CanvasRenderingContext2D, w: number, h: number, bg = "#fafaf9") {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
}

/** 浅网格 + 过原点的坐标轴。 */
export function drawAxes(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(120,113,108,0.10)";
  for (let v = Math.ceil(DOMAIN_MIN); v <= DOMAIN_MAX; v++) {
    const [gx] = dataToPx([v, 0], w, h);
    const [, gy] = dataToPx([0, v], w, h);
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }
  // 原点轴线略深
  ctx.strokeStyle = "rgba(120,113,108,0.22)";
  const o = dataToPx([0, 0], w, h);
  ctx.beginPath();
  ctx.moveTo(o[0], 0);
  ctx.lineTo(o[0], h);
  ctx.moveTo(0, o[1]);
  ctx.lineTo(w, o[1]);
  ctx.stroke();
}

export function drawPoints(
  ctx: CanvasRenderingContext2D,
  pts: Vec2[],
  w: number,
  h: number,
  color: string,
  radius = 2,
) {
  ctx.fillStyle = color;
  for (const p of pts) {
    const [px, py] = dataToPx(p, w, h);
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 画一条折线轨迹（数据坐标）。 */
export function drawPath(
  ctx: CanvasRenderingContext2D,
  pts: Vec2[],
  w: number,
  h: number,
  color: string,
  alpha = 0.5,
  width = 1,
) {
  if (pts.length < 2) return;
  ctx.strokeStyle = withAlpha(color, alpha);
  ctx.lineWidth = width;
  ctx.beginPath();
  const p0 = dataToPx(pts[0], w, h);
  ctx.moveTo(p0[0], p0[1]);
  for (let i = 1; i < pts.length; i++) {
    const p = dataToPx(pts[i], w, h);
    ctx.lineTo(p[0], p[1]);
  }
  ctx.stroke();
}

/** 在数据坐标里画一段带箭头的向量（用于速度场）。 */
export function drawArrow(
  ctx: CanvasRenderingContext2D,
  from: Vec2,
  to: Vec2,
  w: number,
  h: number,
  color: string,
  alpha = 0.9,
) {
  const a = dataToPx(from, w, h);
  const b = dataToPx(to, w, h);
  ctx.strokeStyle = withAlpha(color, alpha);
  ctx.fillStyle = withAlpha(color, alpha);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const s = 4;
  ctx.beginPath();
  ctx.moveTo(b[0], b[1]);
  ctx.lineTo(b[0] - s * Math.cos(ang - 0.4), b[1] - s * Math.sin(ang - 0.4));
  ctx.lineTo(b[0] - s * Math.cos(ang + 0.4), b[1] - s * Math.sin(ang + 0.4));
  ctx.closePath();
  ctx.fill();
}

/** 把 #rrggbb 配上 alpha 通道。 */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}

/** 按 devicePixelRatio 设置画布物理像素，返回 CSS 逻辑尺寸 (w,h)。 */
export function setupHiDPICanvas(
  canvas: HTMLCanvasElement,
  cssSize: number,
): { ctx: CanvasRenderingContext2D; w: number; h: number } {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  canvas.width = cssSize * dpr;
  canvas.height = cssSize * dpr;
  canvas.style.width = `${cssSize}px`;
  canvas.style.height = `${cssSize}px`;
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: cssSize, h: cssSize };
}
