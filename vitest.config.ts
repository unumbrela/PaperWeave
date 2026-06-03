import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// 单测聚焦「关键纯逻辑 + 仓储层」：arXiv 解析、检索过滤、OMML→LaTeX、
// 注册表不变量、Dexie 仓储（fake-indexeddb）。不跑浏览器，CI 内即可硬门禁。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globals: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
});
