import type { Metadata } from "next";
import { CNNExplainer } from "@/components/cnn-explainer/CNNExplainer";

export const metadata: Metadata = {
  title: "CNN 可视化 · Toolbox",
  description:
    "把 tiny-VGG 搬进浏览器——一层层看像素如何被抽象成 feature map，最后落到 10 类之一。",
};

export default function Page() {
  return <CNNExplainer />;
}
