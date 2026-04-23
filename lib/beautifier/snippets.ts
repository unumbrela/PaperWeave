import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "components", "beautifier");

function read(file: string): string {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

export type BeautifierItem = {
  slug: "mesh-orbs" | "raycast" | "trae" | "beautiful-aurora";
  name: string;
  tagline: string;
  inspiration?: string;
  componentName: string;
  filename: string;
  source: string;
  theme: "light" | "dark";
  accent: string;
};

export function loadSnippets(): BeautifierItem[] {
  return [
    {
      slug: "mesh-orbs",
      name: "Mesh Orbs",
      tagline: "暖色纸面基调 + 多色径向 blob 漂移，站点当前主背景的即插即用版。",
      componentName: "MeshOrbsBackground",
      filename: "mesh-orbs-background.tsx",
      source: read("mesh-orbs-background.tsx"),
      theme: "light",
      accent: "#ff8aa0",
    },
    {
      slug: "raycast",
      name: "Raycast Aurora",
      tagline: "Raycast 官网同款：大尺寸彩色 orb + 慢转 conic halo + 颗粒。",
      inspiration: "https://www.raycast.com",
      componentName: "RaycastBackground",
      filename: "raycast-background.tsx",
      source: read("raycast-background.tsx"),
      theme: "dark",
      accent: "#ff3d7f",
    },
    {
      slug: "trae",
      name: "Trae Flow",
      tagline: "Trae.ai 同款：深色基底 + 流动 aurora + 细点栅格，冷色偏科技感。",
      inspiration: "https://www.trae.ai",
      componentName: "TraeBackground",
      filename: "trae-background.tsx",
      source: read("trae-background.tsx"),
      theme: "dark",
      accent: "#3b6ef6",
    },
    {
      slug: "beautiful-aurora",
      name: "Beautiful Aurora",
      tagline:
        "复刻 CodePen《The Aurora》：黑底舞台 + 4 团 morphing blur blob，只保留 the beautiful aurora 主视觉。",
      inspiration: "https://codepen.io/ostylowany/pen/vYzPVZL",
      componentName: "BeautifulAuroraBackground",
      filename: "beautiful-aurora-background.tsx",
      source: read("beautiful-aurora-background.tsx"),
      theme: "dark",
      accent: "#00c2ff",
    },
  ];
}
