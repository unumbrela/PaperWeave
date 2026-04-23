import type { Metadata } from "next";
import { HamishPage } from "@/components/hamish-portfolio/HamishPage";

export const metadata: Metadata = {
  title: "Hamish Portfolio · 位移球体首页 · Toolbox",
  description:
    "从 HamishMW/portfolio 抽取的核心 Intro：MeshPhongMaterial + onBeforeCompile 注入的 Perlin noise 位移球体 + 片假名解码文字动画，附中文源码解读。",
};

export default function Page() {
  return <HamishPage />;
}
