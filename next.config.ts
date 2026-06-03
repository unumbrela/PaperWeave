import type { NextConfig } from "next";

// 注：Next 16 已不在 build 阶段运行 ESLint（lint 在 CI 中单独跑，见 .github/workflows/ci.yml）。
const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
