# Prompt Chunker · 复杂提示词拆解器 — 实施计划

> 路由：`/tools/prompt-chunker`（中文标题：**任务拆解器 · Chunk It Up**）
>
> 分类：效率 · 工具

---

## 一、定位与理论包装

### 产品一句话

粘贴一段复杂任务 / 粗糙 prompt，工具会跑一套"预处理 → 原子化 chunk → 子任务 scaffold → 验收与后处理 → 可执行 Runbook"的管线，输出一份**小模型也能稳定吃下**的 prompt 包。

### 假设（理论基础）

> **核心假设**：只要把问题拆得足够细小，即使小 LLM 也能解决任意复杂任务。

这一假设背后有三条已发表的证据：

1. **Least-to-Most Prompting** (Zhou et al., 2022)  
   [arXiv:2205.10625](https://arxiv.org/abs/2205.10625) · Google  
   把复杂任务拆成从易到难的子问题序列，逐个解；在 SCAN compositional 泛化上，GPT-3 code-davinci-002 从 CoT 的 16% → **99%**。
2. **Decomposed Prompting (DecomP)** (Khot et al., ICLR 2023)  
   [OpenReview](https://openreview.net/forum?id=_nGgzQjzaRy)  
   模块化、可递归，子任务可派发给专门的小 LLM；复杂任务分解后每个 chunk 可以用更廉价的模型独立求解。
3. **Divide-and-Conquer for LLMs** (2024)  
   [arXiv:2402.05359](https://arxiv.org/html/2402.05359v3)  
   在长文本幻觉检测、大整数乘法等原本"裸 prompt 完全做不到"的任务上，分治路径显著稳定超过直接提问。

工具不是这些论文的实现，而是把它们的经验**打包成一个 prompt-to-prompt 转换器**。

### 五阶段管线（输出结构）

```
用户的复杂任务
  │
  ├─ ① Preprocess 预处理
  │    - 真实目标是什么（去语气、去冗余）
  │    - 模糊点 / 隐含假设 / 缺失输入
  │    - 成功长什么样（具体、可验证）
  │
  ├─ ② Chunk It Up 原子化拆分
  │    - 子任务列表 C1..Cn（每个都小到单次调用可搞定）
  │    - 依赖图（谁依赖谁的输出）
  │    - 每个 chunk 的复杂度打分
  │
  ├─ ③ Scaffold 每个 chunk 加脚手架
  │    - 角色 / 输入 / 输出格式 / 验收标准
  │
  ├─ ④ Verify & Post-process 验收与后处理
  │    - 逐 chunk 验收 checklist
  │    - 跨 chunk 一致性检查
  │    - 合并策略 / 失败重试策略
  │
  └─ ⑤ Runbook 最终可执行提示词包
       一整段可以直接喂给 Agent / Claude Code 的 Markdown，
       包含全部 chunk、顺序、验收。可一键复制。
```

---

## 二、命名 & 视觉

| 字段 | 值 |
|---|---|
| slug | `prompt-chunker` |
| 中文名 | **任务拆解器** |
| 英文副名 | Chunk It Up |
| icon | 🧩 |
| gradient | `from-[#f59e0b] to-[#ec4899]`（琥珀 → 品红，和现有都不撞） |
| category | 效率 |
| accent（tool-shell） | `#f59e0b` |
| description | "粘贴一段复杂任务，自动拆成原子子问题 + 验收清单 + 可直接执行的 Runbook。小模型也能稳跑。" |

---

## 三、文件清单（新增）

| 文件 | 作用 |
|---|---|
| `app/tools/prompt-chunker/page.tsx` | 页面：左输入 + 右流式输出 + 理论卡 + 示例 |
| `app/api/chunk-it-up/route.ts` | DeepSeek streamText，固定五阶段输出结构 |
| `lib/tools-registry.ts` | 新增一条 TOOL |
| `components/tool-shell.tsx` | ACCENTS 里新增 `"prompt-chunker": "#f59e0b"` |
| `PLAN-prompt-chunker.md` | 本文档 |

不新建共享组件，不改通用 UI。

---

## 四、API 契约

`POST /api/chunk-it-up`

Body:
```ts
{
  task: string;                    // 原始复杂任务 / 粗糙 prompt
  executor: "agent" | "small-llm" | "human-team"; // 最终执行者
  maxChunks: 4 | 6 | 8 | 12;       // 目标拆分粒度上限
  domain?: string;                 // 可选，例如"代码"/"研究"/"产品"
}
```

输出：纯文本流（Markdown），按五阶段硬编码章节顺序。末尾带一段用代码块包起来的 Runbook，可直接复制。

---

## 五、UI 设计

### 布局（沿用 ToolShell + grid lg:[5fr,7fr]）

**左列（输入卡片）**
- 「原始复杂任务」textarea（rows=12）
- 「最终执行者」三选一 pill：`Agent` / `小模型` / `人 + 团队`
- 「目标 chunk 数上限」4 段 segmented：4 / 6 / 8 / 12
- 「领域（可选）」单行输入
- 主按钮：**Chunk it up →**

**右列**
- StreamOutput 直接渲染 Markdown（所有五阶段在同一条流里按顺序出现）
- 空态 hint："粘贴任务，让拆解器把它切成小模型也能啃的块。"

### 顶部：理论卡（浅色 surface，紧贴 hero 下方）

一块小卡片，三行：

> **假设：** 只要任务拆得足够细小，小 LLM 也能解决任意复杂任务。  
> **依据：** Least-to-Most Prompting (Zhou et al., 2022) · Decomposed Prompting (Khot et al., 2023) · Divide-and-Conquer LLMs (2024)  
> **管线：** Preprocess → Chunk → Scaffold → Verify → Runbook

### 底部：示例区（沿用 skill-maker 的 ExampleCard 样式，但本地化给本工具）

三个示例，每个点击即填入左表单并滚到顶部：

1. **写一个登录系统**（executor=Agent, maxChunks=8, domain=代码）  
   裸 prompt："给我写一个完整的登录系统，要安全、要好看、要能发邮件验证码。"  
   演示"模糊大任务 → 可执行 runbook"的价值。

2. **给公司做一份竞品分析报告**（executor=人+团队, maxChunks=6, domain=研究）  
   裸 prompt："调研下我们这个赛道的前 5 名，做个报告，要有图表，要说出我们的机会。"  
   演示"人类协作"场景。

3. **一篇关于 DWT 医学分割的博客**（executor=小模型, maxChunks=12, domain=写作）  
   裸 prompt："写一篇技术博客讲 DWT 在医学图像分割里为什么有用，带例子，3000 字。"  
   演示"3000 字长文 → 12 个 chunk 能让小模型稳定串出来"。

### 示例卡组件字段

```ts
type ChunkExample = {
  key: string;
  title: string;        // 中文
  subtitle: string;     // 一句话价值
  accent: string;       // 卡片主色
  form: {
    task: string;
    executor: "agent" | "small-llm" | "human-team";
    maxChunks: 4 | 6 | 8 | 12;
    domain?: string;
  };
  naiveResult: string;  // "裸 prompt 大模型给出的典型糟糕回答"（一句话描述）
  chunkedResult: string;// "走管线后小模型稳定产出" 的一句话描述
};
```

示例卡除了 "填入示例" 按钮，还显示一行对照：

```
裸 prompt →  [ 长篇大而空，漏掉邮箱验证码步骤，没有安全审计 ]
拆解后   →  [ 8 个原子 chunk + 验收 + Runbook，Claude Haiku 也能一次跑过 ]
```

用这条对照来表达"原来直接问解决不了，拆解后就行"。

---

## 六、system prompt 要点（给 API 写 prompt 时）

- 严格中文 + Markdown 输出；所有五个一级标题必须出现且顺序固定。
- 预处理阶段必须主动指出**原任务的模糊点与隐含假设**，不能默认用户说清楚了。
- Chunk 拆分要遵循：
  - 每个 chunk 单次调用能解决（粗估 < 500 token 输出）；
  - 有依赖图；
  - 数量 ≤ `maxChunks`；
  - 按 executor 类型调整（Agent → 可含 tool use；小模型 → 每个 chunk 必须能独立解；人+团队 → 说明谁负责）。
- Scaffold 必须给出：角色、输入、输出格式（精确到字段）、验收标准。
- 验收阶段要给"怎么知道这个 chunk 做错了"的显式信号。
- 最终 Runbook 必须是**一整段独立完整的 Markdown**，包在 \`\`\`markdown 代码块里，用户可直接复制喂给下游。不写省略号、不写"以此类推"。

---

## 七、实施顺序（Task 对齐）

1. 写本 PLAN
2. 注册表 + accent
3. API route
4. 页面 + 示例
5. `pnpm build` 冒烟（typecheck + lint）

不涉及数据库、无需 env 变更（复用现有 `DEEPSEEK_API_KEY`）。

---

## 八、不做 / 暂缓

- 真正跑多个 LLM 调用（工具目前只产出 prompt 包，不执行）。下一版可加 "试跑"：用 Haiku 按 Runbook 串跑并回填每 chunk 结果。
- 导出成 JSON / YAML 给其他 agent 框架消费。V2 再说。
- 多轮改写：目前生成一次即可；retry 已在 StreamOutput 里。
- 评测模块（run naive vs run chunked 对比数字）。需要真跑模型，超范围。
