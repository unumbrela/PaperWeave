# PaperWeave · Claude Code Skills

把 PaperWeave 的核心能力封装成可直接安装进 Claude Code 的 skill——在终端里查论文、梳理方向脉络、出引文、画论文图，不用打开浏览器。

| Skill | 触发场景 | 依赖 |
| --- | --- | --- |
| [`paper-search`](./paper-search/SKILL.md) | 「查一下 X 方向的论文」「有哪些高被引工作」 | curl，免 API key |
| [`research-genealogy`](./research-genealogy/SKILL.md) | 「梳理 X 方向的发展历程」——产出引文核验的**发展族谱**（树 + 叙事报告），不止论文列表 | python3（stdlib），免 API key |
| [`cite-paper`](./cite-paper/SKILL.md) | 「给我这篇的 BibTeX / GB-T 7714」 | curl，免 API key |
| [`paper-figure`](./paper-figure/SKILL.md) | 「画一张投稿用的结果对比图」 | python3 + matplotlib（可选） |

四个 skill 正好覆盖「查论文」环的纵深递进：**搜列表**（paper-search）→ **懂脉络**（research-genealogy）→ **出引文**（cite-paper）；paper-figure 服务「论文绘图」环。

## 安装

```bash
# 装单个（以 research-genealogy 为例）
mkdir -p ~/.claude/skills && cp -r skills/research-genealogy ~/.claude/skills/

# 或全部安装
cp -r skills/paper-search skills/research-genealogy skills/cite-paper skills/paper-figure ~/.claude/skills/
```

装完后在 Claude Code 里直接用自然语言触发（如「帮我查 mamba 分割的论文」），Claude 会按 skill 里的步骤执行。

## 与 Web 端的关系

skill 不是另一套实现，而是同一套领域知识的命令行形态：

- `paper-search` 的检索源与查询方式 = `lib/paper-search/search-service.ts`（OpenAlex + arXiv，免 key）；
- `research-genealogy` 是「上游输出即下游输入」跨越终端的实例：skill 在终端产出 `lineage.json`，站内 `/tools/research-genealogy` 页把它渲染成可点击的族谱树（解析逻辑在 `lib/genealogy/lineage.ts`，schema 见本目录 README）。它自带 4 个 stdlib-only Python 脚本（检索 / 谱系推导 / 引文核验 / 渲染），上游独立仓库为 `unumbrela/research-genealogy`，此处为内置拷贝，两边改动需互相同步；
- `cite-paper` 的引文规则 = `lib/export/citations.ts`（BibTeX 条目类型 / GB-T 7714 体例与 Web 端一致）;
- `paper-figure` 的出版规范 = `app/api/figure-generator/route.ts` 的系统提示（Okabe-Ito 配色 / 单双栏尺寸 / 矢量导出 / 自查清单）。

Web 端改了规则，请同步这里，反之亦然。

> 想自己封装新 skill？用站内的「研究自动化封装器」（`/tools/skill-maker`）：描述需求 → 生成规范的 SKILL.md → 一键复制安装命令。
