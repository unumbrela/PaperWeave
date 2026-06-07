# PaperWeave 项目体检报告

> 体检日期：2026-06-07 · 范围：产品立意 + 前后端 + 网页可用性
> 基线状态：`pnpm build` ✅ · `pnpm lint` ✅（0 error / 19 warning）· `pnpm test` ✅（42/42）

## 🔬 第二轮深挖（2026-06-07）—— 更深的结构性硬伤

### 🔴 H1 ── 整套「影子后端」死代码：Prisma REST 层与真实数据栈并存
全站真实数据路径是 **本地 Dexie（`lib/db/repository.ts`）+ Supabase 同步（`lib/sync/cloud-sync.ts`）**。
但仓库里还**完整保留着另一套基于 Prisma/Postgres 的后端**，且**前端一个都不调**：

| 死代码（零前端调用） | 说明 |
|----|----|
| `app/api/papers/route.ts`、`app/api/papers/[id]/route.ts` | Prisma CRUD；前端只用其下的 `import/arxiv`、`import/pdf`（纯内存解析，是活的） |
| `app/api/annotations/route.ts` → `lib/annotation/service.ts` | Prisma 批注 CRUD；viewer 实际走 `repository`（Dexie），此路无人调 |
| `app/api/research-notes/route.ts` → `lib/research-note/service.ts` | 同上，笔记走 Dexie |
| `app/api/analyze` 的 `paperId` 分支 | Prisma + 读 `public/<pdfPath>`，**已在本轮删除（见下 H2）** |
| `lib/db/prisma.ts`、`prisma/schema.prisma`、`@prisma/*` 依赖、`postinstall: prisma generate` | 为这套死栈付出的构建/依赖成本 |

**为什么是硬伤**：①README 还把 Prisma+PostgreSQL 写成「云端持久化」，与实际（Supabase）不符，**误导贡献者**；
②两套 schema（`prisma/schema.prisma` 与 `supabase/schema.sql`）双重维护、易漂移；③多一套对外暴露但无人用的
HTTP 端点 = 多一份攻击面；④拖着 Prisma 依赖与 `postinstall` 生成步骤。

**建议（需你拍板，未擅自执行）**：整套移除 Prisma 层（被 Dexie+Supabase 完全取代），连带删 `@prisma/*`、
`pg`、`prisma/`、`lib/db/prisma.ts` 及上述死路由/服务，并修正 README 的持久化描述。若你想保留一个「服务端 REST API」
供未来外部集成，则应：给这些路由**加鉴权**、对齐到 Supabase、并在文档里明确——而不是放任裸奔。

### 🟠 H2 ── `/api/analyze` 路径穿越（LFI）+ 死分支 —— ✅ 本轮已修
该路由是**活的**（`/library` 的「分析」按钮在用），但其 `paperId` 分支
`fs.readFileSync(path.join(process.cwd(),'public', pdfPath))` 用 DB 里的 `pdfPath` 拼路径读文件——
一旦 `pdfPath` 含 `../`，即可读服务器任意文件（LFI）。而前端从不传 `paperId`（只传 `text`），整条分支是死的。
已把该路由**简化为纯无状态文本分析**（移除 fs/path/prisma/`extractTextFromPdf`），既消漏洞又对齐架构。

### 🟡 H3 ── `pdf-proxy` 仍是「公网内容」开放代理（SSRF 已堵，滥用面未堵）
本轮已堵住 SSRF（内网/元数据）。但它仍会**代理任意公网 https 主机的任意内容**，且不校验返回是不是 PDF、
不限大小，还带 `Access-Control-Allow-Origin: *`——等于一个可被白嫖带宽、可借你的域名分发任意内容的开放代理。
**建议**：只放行 `content-type: application/pdf`（或已知开放获取域名白名单）、加响应大小上限（如 ≤ 50MB）。

### 🟡 H4 ── 检索 `maxResults` 无上限
`app/api/paper-search/route.ts` 用 `body.maxResults || 30`，无封顶。各上游虽自有上限，仍建议
`Math.min(body.maxResults || 30, 100)` 夹一下，避免被构造大值放大开销。

### 🟢 H5 ── 流式工具在 Vercel Hobby 上有超时风险
`idea-generator` 用 `deepseek-reasoner`（实测单次 ~28s），`maxDuration=60` 是 Hobby 上限；长输出可能 60s 超时。
属部署层取舍——文档已提 Pro 可放宽到 300s，建议在 UI 上对这类长任务给「可能较慢」的预期提示。

---

## ✅ 本轮修复进度（2026-06-07）

| 项 | 状态 | 说明 |
|----|------|------|
| P0 arXiv 检索失效 | **已修复** | `sortOrder=desc`→`descending`，并让 arXiv 尊重前端排序、加 UA；新增回归单测；真机验证 arXiv 返回真实结果 |
| P1 提交真实凭证 | **已修复（工作区）** | `AUTH-SETUP.md` 换回占位符；⚠️ git 历史里仍有，需 `轮换 anon key` + 可选历史清理 |
| P2 pdf-proxy SSRF | **已修复** | fetch 前 DNS 解析逐 IP 比对内网/环回/链路本地/元数据/CGNAT/IPv6 ULA，挡 DNS rebinding |
| P2 登录入口误导 | **本就已处理** | `AccountButton` 在未配置时已 `return null`，`AuthDialog` 有未配置横幅 + 禁用按钮，无需改 |
| P3 生产日志打请求体 | **已修复** | 移除 `/api/paper-search` 里打印整个请求体的 console.log |
| P3 lint warnings | **已清零** | `pnpm lint` 现 0 warning |
| P3 死代码 | **已删除** | `components/pdf-viewer/`（4 个无人引用文件）+ `app/api/papers/download-pdf/`（无人调用且 fs 写盘，Vercel 上必崩） |
| 额外：缩放后高亮错位 | **已修复** | `ViewerClient` 的 `handleTextSelection` 用 `[]` 依赖捕获了陈旧 `scale`，改为 `[scale]` |
| P3 dev/build 打包器不一致 | 未改（保留） | `build --webpack` 多半是 Prisma 兼容考虑，仅建议 CI 以 build 为准 |
| P3 PDF 不跨设备 / Prisma 与 Supabase 并存 | 未改（文档项） | 属已自述的 v1 限制，建议文档层面澄清 |

---


整体结论：**架构与立意是扎实的**（注册表驱动、本地优先 + 零配置、BYOK 不烧站长钱、登录后跨设备同步），
代码工程化程度高于一般个人项目。但**有一个会直接打脸首页承诺的核心 Bug**，外加若干影响"第一印象 / 信任感"的问题。
下面按严重度排序。

---

## 🔴 P0 ── arXiv 检索 100% 失效（核心链路断裂）

**现象**：调用 `/api/paper-search` 选 arXiv 源时永远返回 0 条，`failedSources: ["arXiv"]`。
前端把它显示为"部分检索源未返回结果：arXiv"。也就是说 README 里大字写着"OpenAlex + arXiv（**已通**）"
的两个源，arXiv 这一半是**完全坏的**。只选 arXiv 时搜索结果直接空白。

**根因**：`lib/paper-search/search-service.ts:172`

```ts
const url = `https://export.arxiv.org/api/query?search_query=${searchQuery}&max_results=${query.maxResults || 20}&sortBy=submittedDate&sortOrder=desc`;
```

arXiv API 的 `sortOrder` 只接受 `ascending` / `descending`，**不接受 `desc`**。传 `desc` 时 arXiv 直接返回
HTTP 400，于是 `searchArXiv` 抛错、该源被记为 failed。实测铁证：

```
sortOrder=desc        → 400
sortOrder=descending  → 200
```

（这类 bug 很隐蔽，因为 OpenAlex 还在工作，搜索"看起来还能用"，只是结果里永远没有 arXiv 的论文。）

**修复**：把 `desc` 改成 `descending`：

```ts
const url = `https://export.arxiv.org/api/query?search_query=${searchQuery}&max_results=${query.maxResults || 20}&sortBy=submittedDate&sortOrder=descending`;
```

**建议补强**（同一处）：
1. 加单测覆盖 URL 构造（现在 test 里有 arXiv 解析用例，但没有 URL 参数合法性用例，所以这个 bug 漏网了）。
2. arXiv 偶发对默认 UA 不稳定，建议给 `fetch` 带上和 `pdf-proxy` 一致的 `User-Agent` 头。

---

## 🟠 P1 ── 真实 Supabase URL + anon key 被提交进仓库

**现象**：`AUTH-SETUP.md` 里直接贴了生产项目的 `https://uexyuahaylzguvqbqulf.supabase.co` 和一段真实
anon key（已进 `git HEAD`，不是占位符）。

**风险评估**：anon key 设计上是"可公开"的（受 RLS 保护），所以**不是高危泄密**；但：
- 暴露了真实 project ref，一旦哪天 RLS 配置出纰漏，攻击面立刻放大；
- 一份"给别人照着填的设置指南"里混进自己的真实凭证，是会被 reviewer / star 用户直接扣信任分的硬伤。

**修复**：把文档里的真实值换回占位符（`https://<你的项目>.supabase.co` / `<anon public key>`），
并在 Supabase 控制台**轮换一次 anon key**（虽不强制，但既然已公开，轮换最干净）。

---

## 🟡 P2 ── 首页"第一眼"缺演示，劝退潜在用户

README 自己都标了 `⚠️ 待补：演示 GIF`，而首页 Hero 也没有任何产品截图 / 动图。
对一个"靠 GitHub 吸引人来用"的项目，**演示缺失 = 转化漏斗第一步就漏光**。立意再好，访客 5 秒内
看不到"它长什么样、能干啥"，就划走了。

**修复**：录一段 `查论文 → 入库 → PDF 批注 → AI 总结` 的端到端 GIF（1280×720），放 `docs/demo.gif`，
README 顶部和首页 Hero 各引一次。这是性价比最高的一项改动。

---

## 🟡 P2 ── 登录入口"看得见、点不动"的隐性门槛

`AccountButton` 等登录 UI 始终渲染；但若没配 `NEXT_PUBLIC_SUPABASE_*`，所有登录方法返回
"登录服务未配置"。手机号登录在没接 SMS 商时也会报错（文档已自述）。对自部署者：克隆下来
默认看到登录按钮、一点却报错，体验割裂。

**修复**：未配置 Supabase 时直接**隐藏**登录入口（`auth-context` 已有 `configured` 标志，
`AccountButton` 据此返回 `null` 即可），而不是渲染一个点了报错的按钮。手机号方式建议在未接 SMS
时从登录弹窗里隐藏。

---

## 🟡 P2 ── `/api/pdf-proxy` 是开放代理，SSRF 防护可被 DNS 绕过

`app/api/pdf-proxy/route.ts` 已经做了"拦内网/环回 IP"的防护（值得肯定），但：
1. 只按**主机名字符串**匹配，没解析 DNS——攻击者用一个解析到 `169.254.169.254`（云元数据）或内网 IP
   的域名即可绕过。
2. 没限制目标域名白名单，本质是个**任何人可白嫖你 Vercel 流量**的开放代理。

**修复**：
- 在 `fetch` 前对目标 host 做 DNS 解析，对解析结果再跑一遍 `isBlockedHost`（堵 DNS rebinding / 元数据端点）；
- 或更稳：维护一个允许的 PDF 来源域名白名单（arxiv.org / 各开放获取站点）。
- 补一个 IPv6 ULA（`fc00::/7`）的拦截。

---

## 🟢 P3 ── 工程细节（不阻塞，但建议清理）

| # | 问题 | 位置 | 建议 |
|---|------|------|------|
| 1 | dev 用 Turbopack、build 用 `--webpack`，两套打包器，dev 正常不代表 build 正常 | `package.json` scripts | 统一打包器，或在 CI 里只信 `pnpm build` 的结果 |
| 2 | 19 条 lint warning（未用 import / 未用变量 / hook 依赖缺失） | 多个 `components/pdf-*` | `eslint --fix` 一遍，hook 依赖手动补 |
| 3 | `/api/paper-search` 里大量 `console.log` 打到生产日志（含请求体） | `app/api/paper-search/route.ts` | 降级为 debug 或删除，避免噪音 + 潜在隐私 |
| 4 | arXiv 始终硬编码 `sortBy=submittedDate`，忽略前端选的 relevance/year/citations | `search-service.ts:172` | 把 `query.sortBy` 映射到 arXiv 的排序参数 |
| 5 | 云同步冲突策略是"最后写入者优先"，且**本地上传的 PDF 不跨设备**（仅元数据同步） | `AUTH-SETUP.md` 已自述 | 短期：UI 上明确提示"换设备后本地 PDF 需重新缓存"；长期：接 Supabase Storage（schema 已留位） |
| 6 | 同时存在 Prisma(`DATABASE_URL`) 与 Supabase 两套持久化方案，易让自部署者困惑 | `prisma/` + `supabase/` | README/文档里明确"二选一，推荐 Supabase"，或移除遗留 Prisma 路径 |

---

## 立意与吸引力评估（回答"够不够好、能不能吸引人用"）

**值得肯定的差异化**：
- 定位精准——"不替你写论文，只让写论文**之外**的每一步顺起来"，避开了红海的"AI 代写"。
- 注册表驱动（`lib/tools-registry.ts` 单一事实源）让加工具的边际成本极低，利于持续迭代和外部 PR。
- 本地优先 + 零配置可用 + BYOK，**降低了试用门槛、又不烧站长的钱**，这套组合很适合开源 demo。
- 模型可视化（CNN 真跑 TF.js 推理、医学分割真实激活回放）是真有料的"钩子"，比纯 CRUD 工具更抓人。

**阻碍"吸引人来用"的关键短板（按影响排序）**：
1. **arXiv 搜索是坏的**（P0）——用户进来体验的第一步"查论文"就半残，直接击穿信任。**必须先修这个。**
2. **没有演示**（P2）——GitHub 访客留不下来，star/试用转化漏在第一屏。
3. **自部署体验有割裂**（登录按钮点了报错、两套数据库方案）——劝退想 fork 的人。

**一句话**：地基和立意都对，是个"差临门几脚"的项目。把 P0（arXiv）和 P2（演示 GIF）这两件做掉，
吸引力会有质变；P1（凭证）和 P2（登录入口）是信任分，顺手清掉。
