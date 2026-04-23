import { TopBar } from "@/components/fluid-sim/TopBar";
import { BrunoFrame } from "./BrunoFrame";
import { Article } from "./Article";

export function BrunoPage() {
  return (
    <div className="hpi-root bruno-root">
      <TopBar
        title="Bruno Simon · folio-2019"
        meta={[
          { label: "Author", value: "Bruno Simon" },
          { label: "Year", value: "2019 / 2025" },
          { label: "License", value: "MIT" },
          { label: "Stack", value: "Three.js · cannon · howler" },
        ]}
        links={[
          {
            label: "2019 源码",
            href: "https://github.com/brunosimon/folio-2019",
          },
          {
            label: "2025 源码",
            href: "https://github.com/brunosimon/folio-2025",
          },
          { label: "原站", href: "https://bruno-simon.com/" },
        ]}
        note={
          <>
            <strong>交付形式说明：</strong>原项目是一个包含物理引擎、空间音频、17 个
            World 子模块的大型 3D 沙盒，完整移植 ≈ 重建项目。本页采用
            <em> iframe 嵌入原站 + 中文源码解读 </em>的形式，重点放在架构分析。
          </>
        }
        accent="#facc15"
      />

      <BrunoFrame />

      <Article />
    </div>
  );
}
