import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.z1ha0.com";

/** robots：允许抓取工具页，屏蔽 API 与用户生成的分享快照页。 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/share/"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
