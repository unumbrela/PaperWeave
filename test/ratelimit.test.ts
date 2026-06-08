import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, clientKey, __resetRateLimit } from "@/lib/api/http";

beforeEach(() => __resetRateLimit());

describe("rateLimit", () => {
  const bucket = { windowMs: 1000, max: 3 };

  it("窗口内放行到 max，超出拒绝", () => {
    const t0 = 10_000;
    expect(rateLimit("k", bucket, t0).allowed).toBe(true);
    expect(rateLimit("k", bucket, t0 + 1).allowed).toBe(true);
    expect(rateLimit("k", bucket, t0 + 2).allowed).toBe(true);
    const blocked = rateLimit("k", bucket, t0 + 3);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("remaining 递减", () => {
    const t0 = 0;
    expect(rateLimit("k", bucket, t0).remaining).toBe(2);
    expect(rateLimit("k", bucket, t0).remaining).toBe(1);
    expect(rateLimit("k", bucket, t0).remaining).toBe(0);
  });

  it("窗口滑过后恢复", () => {
    const t0 = 0;
    rateLimit("k", bucket, t0);
    rateLimit("k", bucket, t0);
    rateLimit("k", bucket, t0);
    expect(rateLimit("k", bucket, t0 + 500).allowed).toBe(false);
    // 超过 windowMs 后旧记录过期
    expect(rateLimit("k", bucket, t0 + 1001).allowed).toBe(true);
  });

  it("不同 key 互不影响", () => {
    const t0 = 0;
    rateLimit("a", bucket, t0);
    rateLimit("a", bucket, t0);
    rateLimit("a", bucket, t0);
    expect(rateLimit("a", bucket, t0).allowed).toBe(false);
    expect(rateLimit("b", bucket, t0).allowed).toBe(true);
  });

  it("retryAfterMs 约等于最早一次落出窗口的剩余时间", () => {
    const t0 = 0;
    rateLimit("k", bucket, t0); // 最早一条在 t0，将于 t0+1000 过期
    rateLimit("k", bucket, t0 + 100);
    rateLimit("k", bucket, t0 + 200);
    const blocked = rateLimit("k", bucket, t0 + 300);
    expect(blocked.retryAfterMs).toBe(700); // 1000 - 300
  });
});

describe("clientKey", () => {
  const mk = (headers: Record<string, string>) =>
    new Request("http://x.com", { headers });

  it("取 x-forwarded-for 第一个 IP", () => {
    expect(clientKey(mk({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }), "search")).toBe("search:1.2.3.4");
  });

  it("退化到 x-real-ip", () => {
    expect(clientKey(mk({ "x-real-ip": "9.9.9.9" }), "search")).toBe("search:9.9.9.9");
  });

  it("都没有则 local", () => {
    expect(clientKey(mk({}), "x")).toBe("x:local");
  });
});
