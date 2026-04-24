import type { Metadata } from "next";
import { AuroraPage } from "@/components/beautiful-aurora/AuroraPage";

export const metadata: Metadata = {
  title: "The Beautiful Aurora · CSS 动效复刻 · Toolbox",
  description:
    "参考 CodePen The Aurora：纯 CSS 的黑底极光标题，保留 4 团动态色块与字体颜色随极光流动变化的核心效果。",
};

export default function Page() {
  return <AuroraPage />;
}
