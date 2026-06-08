import { defineConfig, devices } from "@playwright/test";

/**
 * E2E：1 条浏览器级 happy-path（检索 → 入库 → 论文库断言），跑真实 React + Dexie。
 * 检索接口被 page.route 拦截注入 fixture，不依赖外部网络，CI 内可稳定硬门禁。
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
