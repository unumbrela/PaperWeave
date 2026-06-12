import { test, expect } from "@playwright/test";

/**
 * AI 工具链路 E2E（拦截 API，不触外部网络、不花 token）：
 *  1. 流式输出渲染：mock /api/summarize 文本流 → StreamOutput 渲染出 Markdown；
 *  2. 零 key 死路已消除：mock 503「未配置」→ friendlyError 卡片给出
 *     「DeepSeek / OpenAI / Gemini 任一」的可操作提示（P0 验收）；
 *  3. 检索全源失败：明确告知上游问题而非「没有匹配论文」（P1 验收）。
 */

test("文献速读：流式响应渲染为 Markdown", async ({ page }) => {
  await page.route("**/api/summarize", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/plain; charset=utf-8",
      body: "## TL;DR\n\n这是端到端测试注入的摘要正文。\n\n## 关键点\n\n- 第一条要点",
    }),
  );

  await page.goto("/tools/summarize");
  await page.getByPlaceholder("https://example.com/article").fill("https://example.com/post");
  await page.getByRole("button", { name: "生成摘要" }).click();

  await expect(page.getByRole("heading", { name: "TL;DR" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("这是端到端测试注入的摘要正文。")).toBeVisible();
});

test("文献速读：零 key 时给出三家任一的可操作提示，而非死路", async ({ page }) => {
  await page.route("**/api/summarize", (route) =>
    route.fulfill({
      status: 503,
      contentType: "text/plain; charset=utf-8",
      body: "AI 服务未配置：请在右上角「API Key」填入你自己的 key（DeepSeek / OpenAI / Gemini 任一）；本地开发也可在 .env.local 配置后重试。",
    }),
  );

  await page.goto("/tools/summarize");
  await page.getByPlaceholder("https://example.com/article").fill("https://example.com/post");
  await page.getByRole("button", { name: "生成摘要" }).click();

  await expect(page.getByText("AI 服务未配置或密钥无效")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/DeepSeek \/ OpenAI \/ Gemini/)).toBeVisible();
});

test("论文检索：全源失败时明示上游问题并给出路", async ({ page }) => {
  await page.route("**/api/paper-search", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [], failedSources: ["openalex", "arxiv"], cached: false }),
    });
  });
  await page.route("**/api/paper-search/hot", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) }),
  );

  await page.goto("/tools/paper-search");
  await page.getByPlaceholder("输入关键词或短语（支持中英文混合）").fill("diffusion segmentation");
  await page.getByRole("button", { name: "开始搜索" }).click();

  await expect(page.getByText(/所有检索源（openalex、arxiv）均未返回结果/)).toBeVisible({ timeout: 15_000 });
});
