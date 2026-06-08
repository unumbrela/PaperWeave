import { describe, it, expect, beforeEach, vi } from "vitest";
import { logEvent, getMetrics, __resetMetrics, startTimer } from "@/lib/api/log";

beforeEach(() => {
  __resetMetrics();
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("logEvent / getMetrics", () => {
  it("聚合调用量、错误率、平均耗时", () => {
    logEvent({ route: "r", ok: true, ms: 100 });
    logEvent({ route: "r", ok: true, ms: 200 });
    logEvent({ route: "r", ok: false, ms: 300 });
    const m = getMetrics().find((x) => x.route === "r")!;
    expect(m.count).toBe(3);
    expect(m.errors).toBe(1);
    expect(m.errorRate).toBe(0.333);
    expect(m.avgMs).toBe(200);
  });

  it("布尔 meta 累加为计数标签（如缓存命中数）", () => {
    logEvent({ route: "s", ok: true, ms: 1, meta: { cacheHit: true } });
    logEvent({ route: "s", ok: true, ms: 1, meta: { cacheHit: true } });
    logEvent({ route: "s", ok: true, ms: 1, meta: { cacheHit: false } });
    const m = getMetrics().find((x) => x.route === "s")!;
    expect(m.tags.cacheHit).toBe(2);
  });

  it("字符串 meta 形成 key:value 计数（如各 provider 占比）", () => {
    logEvent({ route: "e", ok: true, ms: 1, meta: { provider: "openai" } });
    logEvent({ route: "e", ok: true, ms: 1, meta: { provider: "openai" } });
    logEvent({ route: "e", ok: true, ms: 1, meta: { provider: "gemini" } });
    const m = getMetrics().find((x) => x.route === "e")!;
    expect(m.tags["provider:openai"]).toBe(2);
    expect(m.tags["provider:gemini"]).toBe(1);
  });

  it("按调用量降序", () => {
    logEvent({ route: "low", ok: true, ms: 1 });
    logEvent({ route: "high", ok: true, ms: 1 });
    logEvent({ route: "high", ok: true, ms: 1 });
    expect(getMetrics()[0].route).toBe("high");
  });

  it("空指标返回空数组", () => {
    expect(getMetrics()).toEqual([]);
  });
});

describe("startTimer", () => {
  it("返回非负毫秒", () => {
    const done = startTimer();
    expect(done()).toBeGreaterThanOrEqual(0);
  });
});
