import type { Metadata } from "next";
import { TransformerExplainer } from "@/components/transformer-explainer/TransformerExplainer";

export const metadata: Metadata = {
  title: "Transformer 可视化 · Toolbox",
  description:
    "端到端流水线：看一句话如何被 Transformer 算成「下一个词」——分词、嵌入、自注意力、多头、前馈、堆叠到输出概率，每步可交互。",
};

export default function Page() {
  return <TransformerExplainer />;
}