"use client";

import { Home } from "./Home";
import { Commentary } from "./Commentary";
import { Article } from "./Article";

export function HpiPage() {
  return (
    <div className="hpi-root">
      <div className="hpi-stage">
        <div className="hpi-stage-home">
          <Home />
        </div>
        <Commentary />
      </div>

      <Article />

      <div id="hpi-not-ported-toast" className="hpi-toast">
        该链接指向原站子页面（/model、/results 等），未一并移植
      </div>
    </div>
  );
}
