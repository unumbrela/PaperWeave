import type { Metadata } from "next";
import { AlgorithmHub } from "@/components/algorithm-visualizer/AlgorithmHub";

export const metadata: Metadata = {
  title: "算法可视化 · Toolbox",
  description:
    "交互式算法可视化集合 — 逐步动画 + C++ 代码高亮 + 状态面板，直观理解经典算法题。",
};

export default function Page() {
  return <AlgorithmHub />;
}
