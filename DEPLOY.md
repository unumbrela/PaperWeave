# 部署指南 · PaperWeave 上线 Vercel + Cloudflare 域名

> 目标：把项目部署成「任何人打开链接就能浏览使用」的公开站点。
> 平台 **Vercel**（Next.js 官方，免费 Hobby 足够）+ 域名 **Cloudflare**（成本价最便宜）+ AI **访客自带 key**（公开零成本、不会被刷爆）。

代码层的部署适配**已经做好**（见本文末「已完成的适配」）。下面是需要你**亲自操作**（登录账号 / 付费）的步骤。

---

## 一、把代码推到 GitHub（已就绪）

仓库已在 `https://github.com/unumbrela/toolbox`。确保 deploy 分支已推送即可：

```bash
git push
```

---

## 二、部署到 Vercel（约 5 分钟）

1. 打开 https://vercel.com → 用 **GitHub 账号登录**。
2. **Add New… → Project** → 选中 `unumbrela/toolbox` 仓库 → **Import**。
3. Framework 会自动识别为 **Next.js**，Build / Output 用默认即可（无需改）。
4. **环境变量（Environment Variables）—— 推荐全部留空**：
   - 走「访客自带 key」模式：不填任何 LLM key，访客在站内 `/settings` 填自己的。
   - 如果你**想让 AI 默认可用、并愿意自己付费**，再加 `DEEPSEEK_API_KEY=<你的 key>`（注意：这会用你的额度，建议同时在 DeepSeek 后台设月度预算上限）。
   - 登录 / 跨设备同步（`NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY`）**可留空**：不填则隐藏登录入口，论文库走纯本地 IndexedDB，零配置即用；需要跨设备同步再按 `AUTH-SETUP.md` 配 Supabase。
5. 点 **Deploy**，等 1–2 分钟。完成后会给一个 `https://<项目名>.vercel.app` 链接。

> 之后每次 `git push` 到 main，Vercel 会自动重新部署。

### 验证上线（打开 `*.vercel.app`）

- 首页 7 环工作流、各模型可视化（CNN / Transformer / 扩散 …）→ 应直接可用。
- 论文检索（`/tools/paper-search`）→ 直接可用（不需要 key）。
- 入库 arXiv 论文 → 阅读 PDF → 批注 → 都应正常（PDF 走同源代理 + 本地 Blob 缓存）。
- AI 功能（速读 / 总结 / 分析 / 解释）→ 第一次会提示「未配置 key」。点右上角 **API Key**，填一个 DeepSeek key 保存后再试 → 应能流式输出。

---

## 三、买域名（Cloudflare，约 $10/年）

1. 打开 https://dash.cloudflare.com → 注册 / 登录。
2. 左侧 **Domain Registration → Register Domains**。
3. 搜索你想要的名字，确认可用后按提示付款（`.com` 约 **$10.44/年**，成本价、无续费溢价、含免费 WHOIS 隐私）。

### 名字建议（你现在叫 PaperWeave，贴合度高，建议沿用）

| 候选 | 说明 |
| --- | --- |
| `paperweave.app` | 最贴名；`.app` 强制 HTTPS，适合工具站 |
| `paperweave.dev` | 开发者气质，适合开源项目 |
| `paperweave.com` | 最通用、最好记（可能已被注册，先查） |
| 备选名 | `paperloom` / `sciweave` / `readweave` / `weavepaper` |

> 买之前先在 Cloudflare 搜索框确认可用；`.com` 被占就退 `.app` / `.dev`。

---

## 四、把域名接到 Vercel（约 5 分钟）

域名在 Cloudflare、站点在 Vercel，标准做法是**在 Cloudflare 加 DNS 记录指向 Vercel**：

1. Vercel → 你的项目 → **Settings → Domains** → 输入你买的域名（如 `paperweave.app`）→ **Add**。
2. Vercel 会给出需要添加的 DNS 记录，通常是：
   - 根域名 `paperweave.app`：`A` 记录 → `76.76.21.21`
   - `www` 子域：`CNAME` → `cname.vercel-dns.com`
   （以 Vercel 页面实际给出的为准。）
3. 回到 Cloudflare → 选中你的域名 → **DNS → Records → Add record**，按上面把记录加上。
   - **重要**：把这两条记录的代理状态（橙色云朵）设为 **DNS only（灰色云朵）**，否则 Cloudflare 代理会和 Vercel 的证书冲突。
4. 等几分钟到几十分钟生效，Vercel 的 Domains 页会显示 ✅ 并自动签发 HTTPS 证书。

完成后访问 `https://paperweave.app` 就是你的站点。

---

## 五、AI 成本模型：访客自带 key（已内置）

- 服务端**默认不带任何 LLM key**；访客在 `/settings` 填入自己的 DeepSeek / OpenAI / Gemini key。
- key 只存访客**本机 localStorage**，调用时经请求头转发给模型厂商，**我们的服务器不持久化**。
- 好处：公开 demo **不花你的钱、不会被恶意刷爆**；检索 / 阅读 / 批注 / 可视化等不依赖 key 的功能照常可用。

---

## 六、上线前的注意事项（诚实清单）

1. **Vercel Hobby = 个人非商业用途**；函数超时 **60s**（已把所有 AI 路由 `maxDuration` 压到 60）。若 AI 长文本生成偶发超时，升级 Pro（$20/月）可放宽到 300s。
2. **第三方素材版权**：iGEM HPI Potsdam 主页内置了第三方素材，公开发布前建议改为「外链引用」规避授权风险（见 PROJECT-SUMMARY §五·8）。
3. **全中文，无 i18n**：海外访客门槛高；后续可先出 README / 落地页英文版。
4. **遗留 dead 路由**：`/api/papers/download-pdf` 仍含磁盘写，但前端已不再调用（PDF 改走 `/api/pdf-proxy` + 本地 Blob）。如担心被直接调用报错，可后续删除。

---

## 已完成的部署适配（代码层）

为了能在 Vercel（无状态、文件系统只读）上跑，本轮已改：

- **PDF 不再落盘**：新增同源代理 `app/api/pdf-proxy`（带 SSRF 防护）；arXiv 入库把 `pdfPath` 指向代理，本地上传把 PDF 直接存进 Dexie Blob；viewer 读取后自动缓存离线。
- **maxDuration ≤ 60**：`idea-generator` / `markdown-convert`（120）、`chunk-it-up`（90）压到 60，符合 Hobby 上限。
- **访客自带 key**：服务端 `lib/ai/keys.ts` 按「请求头 → 环境变量」解析 key；流式 + 非流式 + 分析/解释路由全部接入；前端 `lib/ai/user-keys.ts` + `/settings` 页 + 右上角入口；`useStream` 与各 AI fetch 自动带上 key 头。
- 构建验证：`pnpm lint` / `tsc` / `pnpm test`（42）/ `pnpm build`（无 key 也能构建）全绿。
