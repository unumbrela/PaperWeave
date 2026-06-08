import type { MetadataRoute } from "next";
import { TOOLS } from "@/lib/tools-registry";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.z1ha0.com";

/** 站点地图：首页 + 论文库相关页 + 注册表里全部工具页（注册表驱动，新增工具自动收录）。 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = ["", "/library", "/library/stats", "/settings"];
  const toolRoutes = TOOLS.map((t) => t.href);

  return [...staticRoutes, ...toolRoutes].map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
