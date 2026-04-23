import type { Metadata } from "next";
import { MedSegExplainer } from "@/components/med-seg/MedSegExplainer";

export const metadata: Metadata = {
  title: "FWMamba-UNet 端到端剖析 · Toolbox",
  description:
    "医学图像分割端到端可视化：从 ISIC 皮肤镜输入，沿 U-Net 架构逐层剖析 FW-Mamba Block 的小波频率分支与 EAFF-Skip 边缘融合。",
};

export default function Page() {
  return <MedSegExplainer />;
}
