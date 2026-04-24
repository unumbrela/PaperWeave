import type { Metadata } from "next";
import { ToolboxBackgroundPage } from "@/components/toolbox-background/ToolboxBackgroundPage";

export const metadata: Metadata = {
  title: "Toolbox 首页动态背景 · Mesh Background · Toolbox",
  description:
    "单独展示当前项目首页的动态背景：暖纸面 mesh blobs + grain 颗粒层，并附中文实现拆解。",
};

export default function Page() {
  return <ToolboxBackgroundPage />;
}
