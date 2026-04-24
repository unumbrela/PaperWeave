import { MeshOrbsBackground } from "@/components/beautifier/mesh-orbs-background";
import { TopBar } from "@/components/fluid-sim/TopBar";
import { Article } from "./Article";
import styles from "./toolbox-background.module.css";

const STATS = [
  { label: "Blobs", value: "5" },
  { label: "Animation", value: "CSS only" },
  { label: "Noise", value: "SVG grain" },
];

export function ToolboxBackgroundPage() {
  return (
    <div className={styles.page}>
      <TopBar
        title="Toolbox 首页动态背景 · Mesh Background"
        meta={[
          { label: "Source", value: "Current project" },
          { label: "Technique", value: "CSS gradients" },
          { label: "Blend", value: "multiply" },
          { label: "Motion", value: "5 keyframes" },
        ]}
        links={[
          { label: "首页", href: "/" },
          { label: "组件集", href: "/tools/web-beautifier" },
        ]}
        note={
          <>
            <strong>展示范围：</strong>这里把当前站点首页那套暖纸面动态背景单独抽成一个舞台，
            保留 <em>5 团 blur blob</em>、颗粒噪点与缓慢漂移逻辑，
            方便直接观察视觉层次，也方便后续复用到别的页面。
          </>
        }
        accent="#ff8aa0"
      />

      <section className={styles.stage}>
        <MeshOrbsBackground />
        <div className={styles.stageShade} />

        <div className={styles.overlay}>
          <div className={styles.kicker}>Current project background · warm paper mesh</div>
          <h1 className={styles.title}>Toolbox Mesh Background</h1>
          <p className={styles.summary}>
            当前首页真正撑起气质的不是某个按钮，而是这层持续缓动的底色：
            暖纸面基底上叠 5 团大尺寸径向色块，再加一层轻微颗粒，让整个站点从纯平界面变成有空气感的画面。
          </p>

          <div className={styles.chips}>
            <span>Radial gradients</span>
            <span>Blur + Multiply</span>
            <span>Pointer-safe</span>
          </div>

          <a href="#mesh-article-anchor" className={styles.cta}>
            往下看这个背景是怎么做的 ↓
          </a>
        </div>

        <aside className={styles.floatingCard}>
          <div className={styles.floatingOverline}>Stage Notes</div>
          <div className={styles.stats}>
            {STATS.map((stat) => (
              <div key={stat.label} className={styles.stat}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>
          <p className={styles.floatingText}>
            这个展示页用的是局部容器版背景组件，因此只占据当前舞台；站点主页本身则是在
            根布局里固定铺满全屏。
          </p>
        </aside>
      </section>

      <Article />
    </div>
  );
}
