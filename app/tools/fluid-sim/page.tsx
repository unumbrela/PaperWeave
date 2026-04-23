import type { Metadata } from "next";
import { FluidPage } from "@/components/fluid-sim/FluidPage";

export const metadata: Metadata = {
  title: "流体模拟 · Fluid Simulation · Toolbox",
  description:
    "原样移植 Pavel Dobryakov 的 WebGL Fluid Simulation（16k+ stars）：GPU Navier–Stokes 流体 + Bloom + Sunrays，附中文源码解读。",
};

export default function Page() {
  return <FluidPage />;
}
