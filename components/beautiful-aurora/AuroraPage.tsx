import { BeautifulAuroraBackground } from "@/components/beautifier/beautiful-aurora-background";
import { TopBar } from "@/components/fluid-sim/TopBar";
import { Article } from "./Article";

export function AuroraPage() {
  return (
    <div className="hpi-root aurora-page-root">
      <TopBar
        title="The Beautiful Aurora · CSS 动效复刻"
        meta={[
          { label: "Source", value: "CodePen" },
          { label: "Technique", value: "CSS only" },
          { label: "Blend", value: "darken · overlay" },
          { label: "Motion", value: "4 blobs" },
        ]}
        links={[
          {
            label: "原始 CodePen",
            href: "https://codepen.io/ostylowany/pen/vYzPVZL",
          },
        ]}
        note={
          <>
            <strong>复刻范围：</strong>保留原作黑底舞台、居中标题与 4 团
            morphing blur aurora 的运动轨迹，只显示
            <em> the beautiful aurora </em>
            主视觉，副标题和编辑器壳层全部移除。
          </>
        }
        accent="#00c2ff"
      />

      <section className="aurora-page-stage">
        <BeautifulAuroraBackground />
        <div className="aurora-page-overlay">
          <div className="aurora-page-kicker">CSS only · dynamic typography stage</div>
          <a href="#aurora-article-anchor" className="aurora-page-cta">
            往下看这个页面是怎么做的 ↓
          </a>
        </div>
      </section>

      <Article />
    </div>
  );
}
