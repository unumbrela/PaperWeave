# PaperWeave 全功能「真正能用」改进方案

> 目标：逐项审计 17 个工具 + 基础设施，把「看起来不错」与「真正能用」之间的差距列出来并消除；
> 适合命令行场景的能力，封装成可安装的 Claude Code Skill。
> 状态标记：✅ 本轮完成 · 🔜 排期 · 💤 维持现状（已能用）。

## 0. 判断标准

一个功能「真正能用」必须同时满足：
1. **默认配置可达**：用项目推荐的最低配置（DeepSeek key 或零 key）就能走通，而不是要求用户再去办别家 key；
2. **失败有出路**：上游挂了/没配 key/没数据时给出可操作的下一步，而不是死路；
3. **产出可带走**：结果能下载/复制/回存，离开本站还有用。

## 1. 逐项审计与动作

### 查论文
| 功能 | 现状 | 差距 | 动作 |
| --- | --- | --- | --- |
| 论文检索 | OpenAlex+arXiv 真实可用、免 key、限流容错齐全 | 命令行场景没法用 | ✅ 封装 `skills/paper-search`（curl 直查 OpenAlex/arXiv，免 key） |
| 引用网络图谱 | OpenAlex 真数据 + D3 可用 | 无 | 💤 |

### 读文献
| 功能 | 现状 | 差距 | 动作 |
| --- | --- | --- | --- |
| 网页速读 | 抓取带超时/UA/正文启发式，健壮 | 无 | 💤 |
| 资料整理器 | docx/pdf/html→md 纯本地解析 | 无 | 💤 |
| 结构化总结 | DeepSeek 流式可用 | 无 | 💤 |
| 多篇对比 | 可用，导出 Markdown | 无 | 💤 |
| **问你的论文库（RAG）** | **必须 OpenAI/Gemini key 才能 embedding，DeepSeek-only 用户直接 503 死路** | **项目默认供应商反而用不了本功能 —— 最大的「看起来不错」项** | ✅ 新增**本地关键词检索降级**（BM25，纯前端零 key 零网络），无 embedding key 自动切换，UI 明示当前模式 |
| 引文导出 | 纯本地 BibTeX/APA/MLA/GB-T 7714 | 命令行场景没法用 | ✅ 封装 `skills/cite-paper`（arXiv ID / DOI / 标题 → 元数据 → 引文，免 key） |

### 生 idea / 做验证
| 功能 | 现状 | 差距 | 动作 |
| --- | --- | --- | --- |
| Idea 生成器 | 可用，已接上下游链路 | 无 | 💤 |
| 任务规划器 | 可用，已接上游 | 无 | 💤 |
| 研究自动化封装器 | 产出 SKILL.md + 安装命令 + 下载，已能用 | 无 | 💤 |

### 论文绘图
| 功能 | 现状 | 差距 | 动作 |
| --- | --- | --- | --- |
| 绘图代码生成器 | 流式可用（上轮新增） | Claude Code 里写论文绘图时用不上这套出版规范 | ✅ 封装 `skills/paper-figure`（出版级绘图规范 + 自查清单，配合本地执行） |

### 讲结果 / 可视化表达
| 功能 | 现状 | 差距 | 动作 |
| --- | --- | --- | --- |
| 5 个模型可视化 | 浏览器内真实推理/回放，教学定位达成 | 无（定位即演示教学） | 💤 |
| iGEM 叙事页 | showcase | 第三方素材授权 | 🔜 发布前改外链 |

### 基础设施
| 功能 | 现状 | 差距 | 动作 |
| --- | --- | --- | --- |
| 论文库/批注/离线 PDF | Dexie v3 分表后健康 | 无 | 💤 |
| 云同步/分享/检索缓存 | 可选降级齐全 | 无 | 💤 |
| 限流/指标/SEO | 内存态，已声明取舍 | 跨实例汇总 | 🔜 需要时上 Upstash |

## 2. Claude Code Skills 封装（本轮交付）

仓库新增 `skills/` 目录，每个 skill 都可一条命令安装到 `~/.claude/skills/`：

| Skill | 能力 | 依赖 |
| --- | --- | --- |
| `paper-search` | 在 Claude Code 里用 OpenAlex + arXiv 查论文（关键词/年份/被引排序），输出带链接的精选表格 | curl，免 key |
| `cite-paper` | arXiv ID / DOI / 标题 → 拉真实元数据 → BibTeX + GB/T 7714 | curl，免 key |
| `paper-figure` | 出版级论文绘图规范（Okabe-Ito 色盲友好、期刊单双栏尺寸、矢量导出、投稿自查清单），指导生成并本地运行绘图代码 | python/matplotlib（可选运行） |

设计原则：skill 只封装**已在 Web 端验证过的逻辑**（检索 API 用法 = `lib/paper-search/search-service.ts`；引文规则 = `lib/export/citations.ts`；绘图规范 = `app/api/figure-generator/route.ts` 的系统提示），两边共享同一套领域知识，不另造一套。

## 3. 🔜 排期项（本轮不做，按价值排序）

1. **E2E 扩面**：AI 工具链路（mock 流式响应）+ 离线 PDF 场景。
2. **README Demo GIF + 公开部署**：人工步骤（Vercel 账号/域名）。
3. **i18n**（至少英文 README）。
4. **iGEM 素材外链化**。
5. **限流/指标上 Redis**（有真实流量后再说）。

---

## 4. 第二轮（2026-06）：「任一家 key 即可用」收口

上一轮把 `streamChat()`（DeepSeek→OpenAI→Gemini 流式 fallback）只接到了 RAG 与多篇对比，
本轮发现并消除了其余环节的同类死路：

| 项 | 严重度 | 动作 |
| --- | --- | --- |
| 6 个流式路由（summarize / idea-generator / markdown-summarize / figure-generator / chunk-it-up / skill-maker）硬编码 DeepSeek-only，只有 OpenAI/Gemini key 的用户直接 503 | 死路 | ✅ 全部迁移到 `lib/ai/stream.ts` 的 `streamChat()`；新增 `deepseekModel` 档位参数保留 idea-generator 的 reasoner；删除孤儿 `lib/ai.ts` |
| `/api/analyze` JSON 解析失败仍返回 `success:true` + 四个「未分析成功」占位字段，被客户端持久化进本地库 | 数据完整性 | ✅ 失败如实返回 422；论文库卡片补「分析中」状态与失败提示，失败不落库 |
| 检索页入库失败只 console.error；非 arXiv（OpenAlex）来源无去重，重复点击重复入库 | 体验 | ✅ 新增按标题（忽略大小写）去重 `repository.findPaperByTitle`；单篇/批量入库失败均有页面提示 |
| 检索全源失败时文案误导（「已展示其余源的结果」但结果为空） | 体验 | ✅ 区分「全源失败」与「部分失败」，前者明示上游问题并给出路 |
| E2E 只有 happy-path | 工程 | ✅ 新增 `e2e/ai-tools.spec.ts`（流式渲染 / 零 key 提示 / 全源失败文案）+ `test/stream-chat.test.ts`（fallback 矩阵）+ 标题去重单测；单测 140→145 |

备注：`ai` / `@ai-sdk/deepseek` 依赖在源码中已零引用，留待下次依赖清理时移除。
