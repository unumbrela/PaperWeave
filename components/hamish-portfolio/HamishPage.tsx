/* eslint-disable react/no-unescaped-entities */

import { TopBar } from "@/components/fluid-sim/TopBar";
import { Intro } from "./Intro";
import { Article } from "./Article";

export function HamishPage() {
  return (
    <div className="hpi-root hamish-root">
      <TopBar
        title="Hamish Portfolio · 位移球体首页"
        meta={[
          { label: "Author", value: "Hamish Williams" },
          { label: "Stars", value: "2k+" },
          { label: "Stack", value: "React · Three.js · GLSL" },
          { label: "License", value: "MIT" },
        ]}
        links={[
          { label: "GitHub", href: "https://github.com/HamishMW/portfolio" },
          { label: "作者原站", href: "https://hamishw.com/" },
        ]}
        note={
          <>
            <strong>你看到的：</strong>MeshPhongMaterial 基础上通过 <em>onBeforeCompile</em>
            注入的 Perlin noise 位移球体，右上角"日文片假名 → 真值"的解码文字动画。
            鼠标移动时球体会跟着 parallax。
          </>
        }
        accent="#8b5cf6"
      />
      <Intro />
      <Article />
    </div>
  );
}
