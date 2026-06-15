import { test, expect } from "@playwright/test";

/**
 * Happy-path：首页 → 论文检索（拦截 API 注入 fixture）→ 入库 → 论文库断言。
 * 覆盖 React 路由 + 检索 UI + Dexie(IndexedDB) 真实写读，全程不触外部网络。
 */

const FIXTURE_TITLE = "E2E Test Paper: Diffusion Models for Segmentation";

const SEARCH_RESPONSE = {
  success: true,
  data: [
    {
      id: "e2e-paper-1",
      title: FIXTURE_TITLE,
      authors: ["Ada Lovelace", "Alan Turing"],
      year: 2024,
      venue: "CVPR",
      url: "https://example.com/e2e-paper-1",
      pdfUrl: "https://example.com/e2e-paper-1.pdf",
      abstract: "A fixture abstract used by the Playwright happy-path test.",
      citations: 123,
      source: "arxiv",
    },
  ],
  failedSources: [],
  cached: false,
};

test("首页 → 检索 → 入库 → 论文库", async ({ page }) => {
  // 拦截检索接口，注入确定性 fixture（避免依赖 OpenAlex/arXiv 在线状态）
  await page.route("**/api/paper-search", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(SEARCH_RESPONSE),
    });
  });
  // 热门检索接口给空，避免无 Supabase 时的网络噪声
  await page.route("**/api/paper-search/hot", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) }),
  );

  // 1) 首页可达，展示品牌
  await page.goto("/");
  await expect(page.getByText("PAPERWEAVE").first()).toBeVisible();

  // 2) 进入论文检索工具
  await page.goto("/tools/paper-search");
  const keyword = page.getByPlaceholder("关键词、方法名或数据集 — 例如 mamba medical segmentation");
  await expect(keyword).toBeVisible();
  await keyword.fill("diffusion segmentation");

  // 3) 触发检索，结果卡片出现（来自 fixture）
  await page.getByRole("button", { name: "检索", exact: true }).click();
  await expect(page.getByText(FIXTURE_TITLE)).toBeVisible({ timeout: 15_000 });

  // 4) 入库（写入 Dexie）—— 单条结果，直接点页面上唯一的「导入库」
  await page.getByRole("button", { name: "导入库" }).click();
  await expect(page.getByText("已入库")).toBeVisible({ timeout: 15_000 });

  // 5) 论文库读出刚入库的论文（Dexie 真实读）
  await page.goto("/library");
  await expect(page.getByText(FIXTURE_TITLE)).toBeVisible({ timeout: 15_000 });
});
