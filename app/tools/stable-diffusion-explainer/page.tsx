import type { Metadata } from "next";
import { StableDiffusionExplainer } from "@/components/stable-diffusion-explainer/StableDiffusionExplainer";

export const metadata: Metadata = {
  title: "Stable Diffusion 文生图讲解 · Toolbox",
  description:
    "交互式理解 Stable Diffusion 文本到图像：CLIP 文本编码、UNet 逐步去噪、引导强度与随机种子如何塑造结果。",
};

export default function Page() {
  return <StableDiffusionExplainer />;
}
