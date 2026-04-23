import type { Metadata } from "next";
import { AuroraPage } from "@/components/beautiful-aurora/AuroraPage";

export const metadata: Metadata = {
  title: "The Beautiful Aurora · CSS 动效复刻 · Toolbox",
  description:
    "复刻 CodePen The Aurora：纯 CSS 的黑底极光标题，只保留 the beautiful aurora 主视觉与动态色块。",
};

export default function Page() {
  return <AuroraPage />;
}
