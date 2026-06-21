import { describe, it, expect } from "vitest";
import {
  marginalVelocity,
  flowEndpoint,
  integrateTrajectory,
  eulerTrajectory,
  rectifiedTrajectory,
  segmentsCross,
  countCrossings,
} from "@/lib/diffusion-explainer/flow";
import { samplePreset, samplePrior } from "@/lib/diffusion-explainer/presets";
import { dataToPx, pxToData } from "@/lib/diffusion-explainer/draw-utils";
import { mulberry32 } from "@/lib/diffusion-explainer/rng";
import { DOMAIN_MAX, DOMAIN_MIN } from "@/lib/diffusion-explainer/config";
import type { PresetId, Vec2 } from "@/lib/diffusion-explainer/types";

describe("marginal velocity (flow matching)", () => {
  it("单点目标：v(x,t) = (x₁−x)/(1−t)", () => {
    const x1: Vec2 = [0.5, -0.3];
    const x: Vec2 = [1.2, 0.4];
    const t = 0.4;
    const v = marginalVelocity(x, t, [x1]);
    expect(v[0]).toBeCloseTo((x1[0] - x[0]) / (1 - t), 8);
    expect(v[1]).toBeCloseTo((x1[1] - x[1]) / (1 - t), 8);
  });

  it("t=0 时所有源点朝数据质心运动", () => {
    const data: Vec2[] = [
      [0, 0],
      [2, 0],
    ]; // 质心 [1,0]
    const x: Vec2 = [1, 1];
    const v = marginalVelocity(x, 0, data);
    expect(v[0]).toBeCloseTo(1 - x[0], 8); // 质心x − x
    expect(v[1]).toBeCloseTo(0 - x[1], 8);
  });

  it("小 (1−t) 下远点速度仍有限（log-sum-exp 稳定）", () => {
    const data: Vec2[] = [
      [0, 0],
      [1, 1],
    ];
    const v = marginalVelocity([5, 5], 0.999, data);
    expect(Number.isFinite(v[0])).toBe(true);
    expect(Number.isFinite(v[1])).toBe(true);
  });
});

describe("曲线流积分", () => {
  function nearest(p: Vec2, data: Vec2[]) {
    let best = Infinity;
    for (const q of data) best = Math.min(best, Math.hypot(p[0] - q[0], p[1] - q[1]));
    return best;
  }

  it("从高斯源积分后终点落在目标流形附近", () => {
    const data = samplePreset("two-gaussians", 300, mulberry32(1));
    const src = samplePrior(40, mulberry32(7));
    const dists = src.map((z) => nearest(flowEndpoint(z, data), data));
    const median = dists.sort((a, b) => a - b)[Math.floor(dists.length / 2)];
    expect(median).toBeLessThan(0.6);
  });

  it("integrateTrajectory 返回 nSteps+1 个点", () => {
    const data = samplePreset("ring", 200, mulberry32(2));
    const traj = integrateTrajectory([0, 0], data, 50);
    expect(traj.length).toBe(51);
  });
});

describe("rectified flow（重流拉直）", () => {
  it("rectified 轨迹是直线：1 步即精确命中曲线流终点", () => {
    const data = samplePreset("two-moons", 200, mulberry32(3));
    const z: Vec2 = [0.6, -0.4];
    const end = flowEndpoint(z, data);
    const traj = rectifiedTrajectory(z, data, 1, end);
    expect(traj.length).toBe(2);
    expect(traj[1][0]).toBeCloseTo(end[0], 10);
    expect(traj[1][1]).toBeCloseTo(end[1], 10);
  });

  it("rectified 多步采样点共线（直线）", () => {
    const z: Vec2 = [0, 0];
    const end: Vec2 = [2, 1];
    const traj = rectifiedTrajectory(z, [], 4, end);
    for (const p of traj) {
      // 直线 y = x/2
      expect(p[1]).toBeCloseTo(p[0] / 2, 10);
    }
  });

  it("曲率是速度的敌人：曲线流少步采样误差 > rectified 少步采样", () => {
    const data = samplePreset("spiral", 220, mulberry32(4));
    const z: Vec2 = [0.8, 0.8];
    const trueEnd = flowEndpoint(z, data);
    const curvedFew = eulerTrajectory(z, data, 2);
    const curvedErr = Math.hypot(
      curvedFew[curvedFew.length - 1][0] - trueEnd[0],
      curvedFew[curvedFew.length - 1][1] - trueEnd[1],
    );
    const rectFew = rectifiedTrajectory(z, data, 2, trueEnd);
    const rectErr = Math.hypot(
      rectFew[rectFew.length - 1][0] - trueEnd[0],
      rectFew[rectFew.length - 1][1] - trueEnd[1],
    );
    expect(rectErr).toBeLessThan(1e-9);
    expect(curvedErr).toBeGreaterThan(rectErr);
  });
});

describe("耦合与交叉", () => {
  it("segmentsCross 判定正确", () => {
    expect(segmentsCross([0, 0], [1, 1], [0, 1], [1, 0])).toBe(true);
    expect(segmentsCross([0, 0], [1, 0], [0, 1], [1, 1])).toBe(false);
  });

  it("重流诱导的耦合交叉数不多于独立耦合", () => {
    const data = samplePreset("two-gaussians", 200, mulberry32(9));
    const src = samplePrior(24, mulberry32(11));
    // 独立耦合：源点配随机目标点
    const rng = mulberry32(13);
    const indep = src.map((z) => ({ a: z, b: data[Math.floor(rng() * data.length)] }));
    // rectified 耦合：源点配其曲线流终点
    const rect = src.map((z) => ({ a: z, b: flowEndpoint(z, data) }));
    expect(countCrossings(rect)).toBeLessThanOrEqual(countCrossings(indep));
  });
});

describe("presets & 坐标变换", () => {
  const ids: PresetId[] = ["two-moons", "spiral", "ring", "two-gaussians", "s-curve", "smiley"];
  it("每个预设返回 n 个点且落在数据域内", () => {
    for (const id of ids) {
      const pts = samplePreset(id, 150, mulberry32(5));
      expect(pts.length).toBe(150);
      for (const [x, y] of pts) {
        expect(x).toBeGreaterThanOrEqual(DOMAIN_MIN);
        expect(x).toBeLessThanOrEqual(DOMAIN_MAX);
        expect(y).toBeGreaterThanOrEqual(DOMAIN_MIN);
        expect(y).toBeLessThanOrEqual(DOMAIN_MAX);
      }
    }
  });

  it("dataToPx / pxToData 往返一致", () => {
    const p: Vec2 = [1.3, -2.1];
    const back = pxToData(dataToPx(p, 440, 440), 440, 440);
    expect(back[0]).toBeCloseTo(p[0], 6);
    expect(back[1]).toBeCloseTo(p[1], 6);
  });
});
