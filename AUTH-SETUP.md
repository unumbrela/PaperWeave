# 登录 + 云端同步设置指南（Supabase）

> 实现：用户登录后，论文库跨设备 / 换浏览器同步、清缓存不丢。
> 用 **Supabase**（Auth + Postgres + 行级隔离 RLS）—— 不用租服务器、不用运维，全部托管，
> 通过环境变量插到你现有的 Vercel 部署上。

代码已全部接好。下面是需要你**在 Supabase / Vercel 控制台操作**的步骤（约 15 分钟）。
**没做这些之前**，站点照常以「纯本地模式」运行，登录入口不显示。

---

## 1. 建 Supabase 项目（2 分钟）

1. https://supabase.com → 登录 → **New project**，选区域（建议离用户近的，如 Singapore）。
2. 项目建好后 → **Project Settings → API**，记下两个值：
   - **Project URL**（形如 `https://xxxx.supabase.co`）
   - **anon public** key

## 2. 建表 + 开启行级隔离（2 分钟）

Supabase 控制台 → **SQL Editor** → New query → 把本仓库 [`supabase/schema.sql`](./supabase/schema.sql) **整段粘贴运行**。
这会建 4 张表（papers / annotations / research_notes / read_progress）并开启 RLS——保证每个用户只能读写自己的数据。

## 3. 配登录方式（按需）

Supabase 控制台 → **Authentication → Providers / Sign In**：

### 邮箱（默认就能用）
- **Email** 默认开启。可在 **Authentication → Sign In / Providers → Email** 里决定是否要求邮箱确认。

### Google 一键登录
1. 去 [Google Cloud Console](https://console.cloud.google.com/) → 创建 OAuth 2.0 客户端（Web）。
2. 在「已授权的重定向 URI」里填 Supabase 给的回调地址：
   `https://<你的项目>.supabase.co/auth/v1/callback`
3. 拿到 Google 的 **Client ID / Secret**，填回 Supabase → **Authentication → Providers → Google** → 开启并保存。

### 手机号（可选，需付费短信商）
- Supabase → **Authentication → Providers → Phone** 开启，并接一个 SMS 服务商（Twilio / MessageBird / Vonage 等，**需要它们的账号和费用**）。
- 没接 SMS 时，登录框里的「手机号」方式会报错——这是正常的，邮箱 / Google 不受影响。

### 回跳地址白名单（重要）
Supabase → **Authentication → URL Configuration**：
- **Site URL** 填 `https://www.z1ha0.com`
- **Redirect URLs** 加上 `https://www.z1ha0.com/**`（以及本地开发 `http://localhost:3000/**`，和 Vercel 预览域名 `https://*.vercel.app/**`）

## 4. 在 Vercel 配环境变量（1 分钟）

Vercel → 你的项目 → **Settings → Environment Variables**，加两条（Production + Preview 都加）：

```
NEXT_PUBLIC_SUPABASE_URL = https://<你的项目>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = <anon public key>
```

> anon key 是**公开**的（受 RLS 保护），放前端没问题。

保存后 **Redeploy** 一次。完成后右上角会出现「登录」按钮。

---

## 工作原理（你不用改代码）

- **本地仍是即时真相源**：写论文 / 批注 / 笔记先落本地 Dexie（零延迟、可离线）。
- **登录后**：每次写操作 best-effort 镜像到 Supabase（带 `user_id`，RLS 隔离）；登录瞬间先把本地已攒的库上推、再从云端拉全量合并 → 换设备 / 清缓存后登录即恢复。
- **未登录 / 未配置**：全部 no-op，退回纯本地，毫不受影响。

## 已知限制（v1）

- **PDF 文件本身不入云**（只同步元数据，Postgres 不适合存大文件）。换设备时：arXiv 论文经 `/api/pdf-proxy` 自动重新拉取；本地上传的 PDF 需在原设备仍在。需要跨设备 PDF 的话，后续可接 **Supabase Storage**（schema 已为此预留空间）。
- 冲突合并是「最后写入者优先」（按 `updated_at`），适合单人多设备；多人协同不在此范围。

## 本地开发

在 `.env.local` 加同样两条 `NEXT_PUBLIC_SUPABASE_*` 即可在本地测试登录；不加则本地为纯本地模式。
