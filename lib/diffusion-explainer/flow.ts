import type { Trajectory, Vec2 } from "./types";
import { FINE_STEPS } from "./config";

/**
 * Flow Matching 的边缘速度场（独立耦合，闭式解）。
 *
 * 取源 X₀~N(0,I)、目标为经验点集 {x₁⁽ʲ⁾}，线性插值路径 Xₜ=(1−t)X₀+tX₁。
 * 给定 j 时 Xₜ|j ~ N(t·x₁⁽ʲ⁾, (1−t)²I)，条件速度为 (x₁⁽ʲ⁾−x)/(1−t)。
 * 对 j 取后验期望得边缘速度（神经网络要逼近的对象）：
 *
 *   v(x,t) = Σ_j w_j (x₁⁽ʲ⁾−x) / [ (1−t) Σ_j w_j ],
 *   w_j ∝ exp( −‖x − t·x₁⁽ʲ⁾‖² / (2(1−t)²) )。
 *
 * 这就是「把众多直线条件速度在交叉点平均」后得到的弯曲速度场。
 * 用 log-sum-exp 数值稳定。
 */
export function marginalVelocity(x: Vec2, t: number, data: Vec2[]): Vec2 {
  const n = data.length;
  if (n === 0) return [0, 0];
  const s = Math.max(1 - t, 1e-4); // 1−t
  const s2 = s * s;

  let maxLog = -Infinity;
  const logw = new Float64Array(n);
  for (let j = 0; j < n; j++) {
    const mx = t * data[j][0];
    const my = t * data[j][1];
    const dx = x[0] - mx;
    const dy = x[1] - my;
    const lw = -(dx * dx + dy * dy) / (2 * s2);
    logw[j] = lw;
    if (lw > maxLog) maxLog = lw;
  }

  let wsum = 0;
  let ax = 0;
  let ay = 0;
  for (let j = 0; j < n; j++) {
    const w = Math.exp(logw[j] - maxLog);
    wsum += w;
    ax += w * (data[j][0] - x[0]);
    ay += w * (data[j][1] - x[1]);
  }
  if (wsum === 0) return [0, 0];
  return [ax / (wsum * s), ay / (wsum * s)];
}

/** Heun（RK2）单步，从 t 推进到 t+dt。 */
function heunStep(x: Vec2, t: number, dt: number, data: Vec2[]): Vec2 {
  const k1 = marginalVelocity(x, t, data);
  const xp: Vec2 = [x[0] + dt * k1[0], x[1] + dt * k1[1]];
  const k2 = marginalVelocity(xp, t + dt, data);
  return [x[0] + (dt / 2) * (k1[0] + k2[0]), x[1] + (dt / 2) * (k1[1] + k2[1])];
}

/**
 * 把源点 x0 沿曲线流积分到 t≈1，返回整条轨迹（含起点）。
 * 在 [0, 1−ε] 上做 nSteps 步 Heun（末端 1/(1−t) 会发散，故留 ε）。
 */
export function integrateTrajectory(
  x0: Vec2,
  data: Vec2[],
  nSteps: number = FINE_STEPS,
): Trajectory {
  const tMax = 1 - 1e-3;
  const dt = tMax / nSteps;
  const traj: Trajectory = [x0];
  let x = x0;
  let t = 0;
  for (let i = 0; i < nSteps; i++) {
    x = heunStep(x, t, dt, data);
    t += dt;
    traj.push(x);
  }
  return traj;
}

/** 曲线流的终点 ψ₁(x0)（即重流诱导耦合里的目标）。 */
export function flowEndpoint(x0: Vec2, data: Vec2[], nSteps: number = FINE_STEPS): Vec2 {
  const traj = integrateTrajectory(x0, data, nSteps);
  return traj[traj.length - 1];
}

/**
 * 曲线流的 k 步 Euler 轨迹（用于「少步采样」对比）。
 * 步数少 → 直线近似偏离真实弯曲路径 → 终点跑偏。
 */
export function eulerTrajectory(x0: Vec2, data: Vec2[], k: number): Trajectory {
  const tMax = 1 - 1e-3;
  const dt = tMax / k;
  const traj: Trajectory = [x0];
  let x = x0;
  let t = 0;
  for (let i = 0; i < k; i++) {
    const v = marginalVelocity(x, t, data);
    x = [x[0] + dt * v[0], x[1] + dt * v[1]];
    t += dt;
    traj.push(x);
  }
  return traj;
}

/**
 * Rectified flow（重流后）的轨迹：源点到其曲线流终点之间的**直线**。
 * 因为 2-rectified 的条件速度恒为 (x₁−x₀)，路径就是直线 —— 任意步数都精确。
 */
export function rectifiedTrajectory(
  x0: Vec2,
  data: Vec2[],
  k: number,
  endpoint?: Vec2,
): Trajectory {
  const x1 = endpoint ?? flowEndpoint(x0, data);
  const traj: Trajectory = [];
  for (let i = 0; i <= k; i++) {
    const a = i / k;
    traj.push([x0[0] + a * (x1[0] - x0[0]), x0[1] + a * (x1[1] - x0[1])]);
  }
  return traj;
}

/**
 * 为一组源点同时构建「曲线流」与「拉直流」轨迹（共享同一终点）。
 * curved[i] 是 flow matching 的弯曲路径，rect[i] 是到同一终点的直线。
 */
export function buildTrajectories(
  source: Vec2[],
  data: Vec2[],
  steps: number = FINE_STEPS,
): { curved: Trajectory[]; rect: Trajectory[]; endpoints: Vec2[] } {
  const curved: Trajectory[] = [];
  const rect: Trajectory[] = [];
  const endpoints: Vec2[] = [];
  for (const z of source) {
    const c = integrateTrajectory(z, data, steps);
    const e = c[c.length - 1];
    curved.push(c);
    endpoints.push(e);
    rect.push(rectifiedTrajectory(z, data, steps, e));
  }
  return { curved, rect, endpoints };
}

/** 在网格上采样速度场（用于箭头/quiver 可视化）。 */
export function velocityField(
  data: Vec2[],
  t: number,
  grid: number,
  min: number,
  max: number,
): { x: Vec2; v: Vec2 }[] {
  const out: { x: Vec2; v: Vec2 }[] = [];
  const step = (max - min) / (grid - 1);
  for (let i = 0; i < grid; i++) {
    for (let j = 0; j < grid; j++) {
      const x: Vec2 = [min + i * step, min + j * step];
      out.push({ x, v: marginalVelocity(x, t, data) });
    }
  }
  return out;
}

/** 两条线段是否相交（用于统计耦合连线的交叉数）。 */
export function segmentsCross(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2): boolean {
  const d = (a: Vec2, b: Vec2, c: Vec2) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const d1 = d(p3, p4, p1);
  const d2 = d(p3, p4, p2);
  const d3 = d(p1, p2, p3);
  const d4 = d(p1, p2, p4);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}

/** 统计一组连线（耦合对）中两两相交的对数。 */
export function countCrossings(pairs: { a: Vec2; b: Vec2 }[]): number {
  let c = 0;
  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      if (segmentsCross(pairs[i].a, pairs[i].b, pairs[j].a, pairs[j].b)) c++;
    }
  }
  return c;
}
