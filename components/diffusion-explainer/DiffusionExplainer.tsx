"use client";

import { useMemo, useState } from "react";
import { Hero } from "./Hero";
import { TargetSelector } from "./TargetSelector";
import { FlowFigure } from "./FlowFigure";
import { ProbabilityPathFigure } from "./ProbabilityPathFigure";
import { CouplingFigure } from "./CouplingFigure";
import { FewStepFigure } from "./FewStepFigure";
import { Markdown } from "@/components/markdown";
import { samplePreset, samplePrior } from "@/lib/diffusion-explainer/presets";
import { mulberry32 } from "@/lib/diffusion-explainer/rng";
import { NUM_POINTS, NUM_TRAJ } from "@/lib/diffusion-explainer/config";
import type { PresetId, Vec2 } from "@/lib/diffusion-explainer/types";

function Section({
  n,
  title,
  body,
  children,
}: {
  n: string;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="max-w-3xl mx-auto">
      <h2 className="serif text-2xl text-ink mb-1">
        <span className="text-[#8b5cf6] mr-2">{n}</span>
        {title}
      </h2>
      <div className="mt-3">
        <Markdown>{body}</Markdown>
      </div>
      {children && <div className="mt-5">{children}</div>}
    </section>
  );
}

export default function DiffusionExplainer() {
  const [presetId, setPresetId] = useState<PresetId>("smiley");
  const [customPoints, setCustomPoints] = useState<Vec2[]>([]);

  const data = useMemo<Vec2[]>(
    () => (presetId === "draw" ? customPoints : samplePreset(presetId, NUM_POINTS, mulberry32(42))),
    [presetId, customPoints],
  );

  // 不同图用不同规模的源样本（一次性、可复现）
  const srcTraj = useMemo(() => samplePrior(NUM_TRAJ, mulberry32(101)), []);
  const srcPath = useMemo(() => samplePrior(280, mulberry32(202)), []);
  const srcCoupling = useMemo(() => samplePrior(22, mulberry32(303)), []);
  const srcFewStep = useMemo(() => samplePrior(60, mulberry32(404)), []);

  const enoughData = data.length >= 5;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <Hero />

      {/* 全局目标分布选择，作用于下方所有图 */}
      <div className="mt-8 max-w-md mx-auto">
        <TargetSelector presetId={presetId} onSelect={setPresetId} onDrawChange={setCustomPoints} />
        {!enoughData && (
          <p className="mt-2 text-center text-xs text-amber-600">
            请在上方「自绘」画布上多涂几笔，下面的图才有目标分布可流向。
          </p>
        )}
      </div>

      <div className="mt-14 space-y-16">
        <Section
          n="①"
          title="流：把噪声搬成数据"
          body={`生成模型要把一个简单的**源分布** $X_0\\sim\\mathcal N(0,I)$ 连续地搬成复杂的**数据分布** $X_1$。我们沿一条概率路径在两者间插值：

$$X_t=(1-t)\\,X_0+t\\,X_1,\\qquad t\\in[0,1].$$

「流」$\\psi_t$ 由一个**速度场** $v_t(x)$ 通过常微分方程生成，采样就是从噪声出发数值积分（如 Euler 法）：

$$\\frac{d}{dt}\\psi_t(x)=v_t(\\psi_t(x)),\\quad \\psi_0(x)=x;\\qquad x_{t+\\Delta}=x_t+\\Delta\\,v_t(x_t).$$

点「播放」，看一团高斯怎样顺着速度场流成数据：`}
        >
          {enoughData && <FlowFigure data={data} source={srcTraj} mode="curved" />}
        </Section>

        <Section
          n="②"
          title="Flow Matching：怎么学这个速度场"
          body={`真正的边缘速度场拿不到，但可以**条件化**在目标点 $x_1$ 上：沿直线插值时，条件速度有闭式

$$v_t(x_t\\mid x_1)=\\frac{x_1-x_t}{1-t}.$$

于是训练目标变成可回归的 Conditional Flow Matching：

$$\\mathcal L_{\\mathrm{CFM}}(\\theta)=\\mathbb E_{t,X_0,X_1}\\big\\|(X_1-X_0)-v^\\theta_t(X_t)\\big\\|^2.$$

关键点：我们用**知道目标** $x_1$ 的条件速度，去监督一个**只看得到当前 $x_t$** 的网络 $v^\\theta_t$。拖动下图的 $t$，看插值边缘 $p_t$ 如何从源演化到数据，粉色箭头就是网络要拟合的边缘速度场：`}
        >
          {enoughData && <ProbabilityPathFigure data={data} source={srcPath} />}
        </Section>

        <Section
          n="③"
          title="问题：曲率是速度的敌人"
          body={`即便每条训练样本的条件速度都是**直线**，学到的流却是**弯**的。为什么？因为网络在某点只能给出一个速度，它只好把所有经过该点的速度做平均：

$$v_t(x)=\\mathbb E[\\,X_1-X_0\\mid X_t=x\\,].$$

平均后的速度随位置变化 → 轨迹弯曲。而弯曲是采样速度的敌人：Euler 法的直线近似在高曲率处严重失真，必须用很多步才能跟住路径。下图把 Euler 步数 $k$ 调小，左边曲线流的终点立刻跑偏：`}
        >
          {enoughData && <FewStepFigure data={data} source={srcFewStep} />}
        </Section>

        <Section
          n="④"
          title="耦合与交叉"
          body={`弯曲的根源是**耦合** $\\pi(x_0,x_1)$ —— 源点和目标点怎么配对。

- **独立耦合** $\\pi(x_0,x_1)=p(x_0)q(x_1)$：随机配对，简单但连线**大量交叉**；
- **最优传输耦合**：让总搬运代价最小，交叉更少、轨迹更直，但高维下昂贵。

两条训练路径在 $(x,t)$ 处交叉，就给出两个互相矛盾的速度，网络只能取平均 —— 这正是曲率的来源。切换下图的耦合方式，看交叉数的变化：`}
        >
          {enoughData && <CouplingFigure data={data} source={srcCoupling} />}
        </Section>

        <Section
          n="⑤"
          title="Rectified Flow：用「重流」把轨迹拉直"
          body={`解决办法：别用独立耦合，改用**模型自己诱导的耦合**。这就是 **reflow**：

1. 用独立耦合 $\\pi_0=p\\times q$ 采样配对，训练速度场 $v^\\theta_1$；
2. 用学到的流把源点流过去，得到新配对 $(X_0,\\;\\psi_1(X_0))$；
3. 在这个**确定性**新耦合上重新训练，得到 $v^\\theta_2$；必要时再重复。

为什么有效？确定性流的轨迹**不会相交**（相交就会处处重合，矛盾）。所以在新耦合上重训，等于删掉了交叉点处的矛盾速度，曲率随之消失。下图叠加对比：紫色是原曲线流，绿色是拉直后的 rectified flow —— 同样的起点和终点，路径却变直了：`}
        >
          {enoughData && <FlowFigure data={data} source={srcTraj} mode="both" />}
        </Section>
      </div>

      <div className="max-w-3xl mx-auto mt-16 rounded-2xl border border-[var(--line)] bg-purple-50/40 p-6">
        <h3 className="serif text-lg text-ink mb-2">从 2D 玩具到真实模型</h3>
        <p className="text-sm text-ink-2 leading-relaxed">
          把维度从二维换成图像 / 潜空间，把这里的闭式速度场换成训练好的网络 vθ，其余机器完全一样。
          Rectified Flow 正是 Stable Diffusion 3、FLUX 等模型少步生成的核心思想之一。
          理解了这张二维实验台，你就理解了它的内核。
        </p>
        <p className="mt-3 text-xs text-ink-4">
          复刻自 Alec Helbling《A Visual Introduction to Rectified Flows》
          (alechelbling.com/blog/rectified-flow)；理论参考 Liu et al. 2022 (Rectified Flow)、
          Lipman et al. 2023 (Flow Matching)。本页所有轨迹用经验分布的闭式边缘速度场实时积分得到，无需训练。
        </p>
      </div>
    </div>
  );
}
