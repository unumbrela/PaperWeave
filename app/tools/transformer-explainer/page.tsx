import type { Metadata } from "next";
import { TransformerExplainer } from "@/components/transformer-explainer/TransformerExplainer";

export const metadata: Metadata = {
  title: "Transformer 可视化 · Toolbox",
  description:
    "交互式理解 Transformer 架构：从输入嵌入、多头注意力机制、残差连接到输出。",
};

export default function Page() {
  return <TransformerExplainer />;
}