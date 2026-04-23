import type { Metadata } from "next";
import { BrunoPage } from "@/components/bruno-folio/BrunoPage";

export const metadata: Metadata = {
  title: "Bruno Simon · 3D 沙盒作品集 · Toolbox",
  description:
    "Bruno Simon 传奇 3D 沙盒作品集 folio-2019：页面内嵌原站，配中文源码解读，拆解 Zones / Tiles / Areas / Physics 多层架构。",
};

export default function Page() {
  return <BrunoPage />;
}
