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
          title="先想清楚：生成到底在干什么"
          body={`我们的**目标**是生成新数据 —— 比如让一堆点排成一张「笑脸」。
**起点**则是纯随机：一团毫无规律、四散开来的点（数学上叫高斯噪声）。
所谓**生成**，就是让每个点动起来，从「随机散开」慢慢走到「排成图案」。

那点怎么知道往哪走？办法是：给空间里**每个位置**都标一个箭头，告诉站在这里的点「此刻该朝哪个方向、走多快」。这张铺满整个画面的「箭头地图」就叫**速度场**。一个点只要每一小步都顺着脚下的箭头走，时间从 0 走到 1，就能从噪声走到数据。这整个过程就叫**流（flow）**。

用公式写出来其实很简单 —— 当前位置加上「一小步 × 当前箭头」，就是下一刻的位置：

$$x_{t+\\Delta}=x_t+\\Delta\\cdot v_t(x_t),\\qquad t:0\\to1.$$

点下面的「播放」，看一团随机的点怎样顺着风聚成你选的图案：`}
        >
          {enoughData && <FlowFigure data={data} source={srcTraj} mode="curved" />}
        </Section>

        <Section
          n="②"
          title="Flow Matching：怎么把这张「风的地图」画出来"
          body={`问题来了：这张完整的风图，一开始我们并不知道，得让神经网络去**学**。可没有标准答案，怎么学？

诀窍是训练时「开卷」。我们随手取一个噪声点当起点、一个真实数据点当终点，把它俩配成一对。这一对之间最省事的走法就是**走直线**，方向正好是「终点 − 起点」。把海量这样的「起点→终点」直线例子喂给网络，它就能在每个位置、每个时刻学会回答一个问题：**平均而言，该往哪个方向走？**

写成训练目标，就是让网络的预测 $v^\\theta$ 尽量贴近这条直线方向：

$$\\min_\\theta\\ \\mathbb E\\,\\big\\|\\,(X_1-X_0)-v^\\theta_t(X_t)\\,\\big\\|^2.$$

拖动下图的时间 $t$，看这团点如何从噪声渐变到数据；**粉色箭头**就是网络要学的那张风图：`}
        >
          {enoughData && <ProbabilityPathFigure data={data} source={srcPath} />}
        </Section>

        <Section
          n="③"
          title="麻烦来了：学出来的路是弯的，而弯就意味着慢"
          body={`这里有个反直觉的现象：**每个训练例子明明都是直线，合起来学出的真实路线却是弯的**。

原因不难懂：同一个位置，会有很多条方向不同的直线穿过它。但网络在一个位置只能给出**一个**箭头，于是它只好取这些方向的**平均**。平均方向在不同地点各不相同，把它们连起来，路线就拐弯了。

弯为什么是问题？因为采样时我们是「沿当前箭头直直地走一步」。路越弯，这种直线近似偏得越多，就得把整段路切成很多小步才能走准 —— 而**每一小步都要跑一次神经网络，步数越多就越慢**。

拖动下图的步数 $k$，把它调小：左边这条弯路的终点立刻**跑偏**。（右边那条已经「理直」的路线我们第 ⑤ 节再讲，这里先看左边。）`}
        >
          {enoughData && <FewStepFigure data={data} source={srcFewStep} />}
        </Section>

        <Section
          n="④"
          title="为什么会弯：起点和终点「乱配对」"
          body={`既然弯来自「同一地点方向打架」，能不能从源头避免打架？关键在于训练时**怎么把起点和终点配成一对** —— 这件事叫**耦合**。

- **随便配**（独立耦合）：噪声点和数据点随机牵线。简单，但连线**横七竖八、大量交叉**。每个交叉点就是一处「同一地点、却要两个方向」的矛盾现场，逼着网络取平均 → 路线变弯。
- **配得好**：如果让连线尽量**不交叉**，矛盾就少，路线自然更直。

切换下图的两种配对方式，注意右上角的**交叉对数**怎么变：`}
        >
          {enoughData && <CouplingFigure data={data} source={srcCoupling} />}
        </Section>

        <Section
          n="⑤"
          title="Rectified Flow：让模型自己把线理直（重流）"
          body={`怎么得到「不交叉」的配对？有个巧妙的循环办法，叫**重流（reflow）**：

1. 先用「随便配」的方式训练出第一版模型；
2. 用这版模型，把每个噪声点**真的流一遍**，记下它实际走到的终点；
3. 用这批新的「起点 → 实际终点」重新配对，再训练一版。

为什么有效？模型流出来的路线**天生不会交叉**（两条确定的轨迹一旦相交，就会从此重合，自相矛盾）。所以拿这种新配对重训，交叉点的矛盾被消除，路线随之**被理直**。理直之后，一步、两步就能从噪声走到数据，采样飞快。

下图把两条路叠在一起：**紫色**是原来的弯路，**绿色**是理直后的路 —— 起点终点都一样，路线却直了：`}
        >
          {enoughData && <FlowFigure data={data} source={srcTraj} mode="both" />}
        </Section>

        <Section
          n="⑥"
          title="拓展：它还能用在哪"
          body={`把这张二维实验台「放大」，就是真实世界的生成模型：维度从二维换成一整张图像（或其压缩后的潜空间），把这里的「闭式风图」换成训练好的神经网络，其余机器一模一样。**Rectified Flow / Flow Matching 正是 Stable Diffusion 3、FLUX 这类模型能做到「少步、近实时」生成的核心思想之一**。

同样的思路 —— *把一个简单分布平滑地搬成复杂分布* —— 远不止用于图像，也被用在分子与蛋白质结构生成、语音与音频合成、视频生成，乃至机器人动作轨迹规划等领域。这里就不再展开。`}
        />
      </div>

      <References />
    </div>
  );
}

function References() {
  const refs = [
    {
      authors: "Alec Helbling",
      title: "A Visual Introduction to Rectified Flows",
      year: "2026",
      href: "https://alechelbling.com/blog/rectified-flow",
      note: "本页交互复刻来源",
    },
    {
      authors: "Xingchao Liu, Chengyue Gong, Qiang Liu",
      title: "Flow Straight and Fast: Learning to Generate and Transfer Data with Rectified Flow",
      year: "2022",
      href: "https://arxiv.org/abs/2209.03003",
    },
    {
      authors: "Yaron Lipman, Ricky T. Q. Chen, Heli Ben-Hamu, Maximilian Nickel, Matt Le",
      title: "Flow Matching for Generative Modeling",
      year: "2023",
      href: "https://arxiv.org/abs/2210.02747",
    },
  ];
  return (
    <div className="max-w-3xl mx-auto mt-16 border-t border-[var(--line)] pt-6">
      <h3 className="serif text-lg text-ink mb-3">参考文献</h3>
      <ol className="space-y-2 text-sm text-ink-2">
        {refs.map((r, i) => (
          <li key={r.href} className="flex gap-2">
            <span className="text-ink-4">[{i + 1}]</span>
            <span>
              {r.authors}.{" "}
              <a
                href={r.href}
                target="_blank"
                rel="noreferrer"
                className="text-[#8b5cf6] underline decoration-dotted underline-offset-2 hover:text-purple-700"
              >
                <em>{r.title}</em>
              </a>
              . {r.year}.{r.note ? <span className="text-ink-4">（{r.note}）</span> : null}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-ink-4">
        注：本页所有轨迹均用经验分布的闭式边缘速度场实时积分得到，无需训练。
      </p>
    </div>
  );
}
