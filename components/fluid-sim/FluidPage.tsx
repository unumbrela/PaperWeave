import { TopBar } from "./TopBar";
import { FluidCanvas } from "./FluidCanvas";
import { Article } from "./Article";

export function FluidPage() {
  return (
    <div className="hpi-root fluid-root">
      <TopBar
        title="流体模拟 · Pavel Dobryakov"
        meta={[
          { label: "Author", value: "Pavel Dobryakov" },
          { label: "Year", value: "2017" },
          { label: "Stars", value: "16k+" },
          { label: "License", value: "MIT" },
        ]}
        links={[
          {
            label: "GitHub",
            href: "https://github.com/PavelDoGreat/WebGL-Fluid-Simulation",
          },
          {
            label: "原站",
            href: "https://paveldogreat.github.io/WebGL-Fluid-Simulation/",
          },
        ]}
        note={
          <>
            <strong>操作方式：</strong>鼠标拖动 / 触摸划动 喷出发光液体，空格键
            <em> 随机涟漪</em>，P 键暂停。这是原仓库的 <em>script.js</em> 1645 行完整运行时，
            只去掉了 dat.gui 控制面板和移动端推广弹窗。
          </>
        }
        accent="#4bb3ff"
      />

      <div className="fluid-stage">
        <FluidCanvas />
        <div className="fluid-hero-overlay">
          <div className="fluid-hero-title">Fluid Simulation</div>
          <div className="fluid-hero-sub">
            Navier–Stokes · Real-time · GPU shader pipeline
          </div>
          <a href="#fluid-article-anchor" className="fluid-hero-cta">
            往下看它是怎么做的 ↓
          </a>
        </div>
      </div>

      <Article />
    </div>
  );
}
