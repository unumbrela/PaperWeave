import type { Metadata } from "next";
import { HpiPage } from "@/components/hpi-potsdam/HpiPage";
import "./landing.css";
import "./overrides.css";

export const metadata: Metadata = {
  title: "HPI Potsdam · iGEM 首页 · Toolbox",
  description:
    "原样移植 HPI Potsdam 2025 iGEM 队伍 BioComplete 主页：Three.js 3D 星图浏览 iGEM Registry 嵌入空间 + 三段式滚动叙事，附中文解读。",
};

export default function Page() {
  return <HpiPage />;
}
