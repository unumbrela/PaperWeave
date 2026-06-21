import type { NextConfig } from "next";

// 注：Next 16 已不在 build 阶段运行 ESLint（lint 在 CI 中单独跑，见 .github/workflows/ci.yml）。
const nextConfig: NextConfig = {
  images: {
    // 资源已离线预压成 WebP（见 scripts/optimize-med-seg.mjs），让优化器统一吐 WebP
    formats: ["image/webp"],
    // 静态展示图基本不变，拉满缓存 TTL（1 年）
    minimumCacheTTL: 31536000,
    // 贴合本项目实际用到的展示尺寸，避免生成多余变体
    imageSizes: [48, 96, 120, 240, 320],
    deviceSizes: [640, 750, 1080],
    qualities: [72, 80],
  },
};

export default nextConfig;
