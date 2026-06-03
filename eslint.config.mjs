import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "reference_repos/**",
    // Vendored / generated assets — not our source, don't lint.
    "public/**",
    // Vendored 模型可视化（transformer / gan / diffusion explainer + ganlab）：
    // 移植自第三方 showcase，非本仓首发代码（见 PROJECT-SUMMARY §五.5）。
    // 不纳入 lint 硬门禁，避免历史 any/require 债务阻塞 CI；核心链路照常严格。
    "components/diffusion-explainer/**",
    "components/gan-explainer/**",
    "components/ganlab/**",
    "components/transformer-explainer/**",
    "lib/diffusion-explainer/**",
    "lib/gan-explainer/**",
    "lib/transformer-explainer/**",
    "hooks/useGANTraining.tsx",
  ]),
]);

export default eslintConfig;
