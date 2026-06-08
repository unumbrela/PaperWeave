-- PaperWeave 云端论文库 schema + 行级安全（RLS）
-- 在 Supabase 控制台 → SQL Editor 里整段粘贴运行一次即可。
-- RLS 保证：每个登录用户只能读写「自己」的行，互不可见。

-- ── 论文 ────────────────────────────────────────────────
create table if not exists public.papers (
  id           text primary key,                       -- 客户端生成（与本地 Dexie 一致）
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  arxiv_id     text,
  title        text not null,
  abstract     text,
  authors      jsonb default '[]'::jsonb,
  source_type  text not null default 'LOCAL',
  source_url   text,
  pdf_path     text,
  published_at text,
  tags         jsonb default '[]'::jsonb,
  direction    text,
  notes        text,
  summary      text,
  methodology  text,
  contribution text,
  citations    integer default 0,
  created_at   text,
  updated_at   text
);

-- ── 标注 ────────────────────────────────────────────────
create table if not exists public.annotations (
  id            text primary key,
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  paper_id      text not null references public.papers(id) on delete cascade,
  page          integer not null default 0,
  rects         jsonb default '[]'::jsonb,
  selected_text text default '',
  type          text not null,
  color         text not null,
  comment       text,
  ai_summary    jsonb,
  created_at    text,
  updated_at    text
);

-- ── 研究笔记（每篇论文一条） ─────────────────────────────
create table if not exists public.research_notes (
  id         text primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  paper_id   text not null references public.papers(id) on delete cascade,
  title      text,
  content    text not null default '',
  created_at text,
  updated_at text
);

-- ── 阅读进度 ────────────────────────────────────────────
create table if not exists public.read_progress (
  id           text primary key,
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  paper_id     text not null references public.papers(id) on delete cascade,
  current_page integer not null default 1,
  total_pages  integer not null default 0,
  last_read_at text
);

create index if not exists idx_papers_user        on public.papers(user_id);
create index if not exists idx_annotations_paper  on public.annotations(paper_id);
create index if not exists idx_notes_paper        on public.research_notes(paper_id);
create index if not exists idx_progress_paper     on public.read_progress(paper_id);

-- ── 行级安全：每人只能读写自己的行 ───────────────────────
alter table public.papers         enable row level security;
alter table public.annotations    enable row level security;
alter table public.research_notes enable row level security;
alter table public.read_progress  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['papers','annotations','research_notes','read_progress']
  loop
    execute format('drop policy if exists "own rows" on public.%I;', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid());', t);
  end loop;
end $$;

-- ── 检索结果缓存（全站共享，非用户私有）──────────────────────
-- 与上面四张「用户私有 + RLS」的表不同：这是服务端用 service-role 读写的
-- 公共缓存，加速热门检索、累积「热门检索词」。RLS 开启但**不建任何 policy**，
-- 于是匿名/登录用户都碰不到它，只有 service-role（绕过 RLS）能读写。
create table if not exists public.search_cache (
  query_hash    text primary key,                 -- lib/paper-search/cache.ts 的 cacheKey()（sha256）
  label         text not null default '',         -- 人类可读查询摘要（热门检索展示用）
  results       jsonb not null default '[]'::jsonb,
  failed_sources jsonb not null default '[]'::jsonb,
  hit_count     integer not null default 0,       -- 命中次数（热度）
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null              -- 过期即视为未命中（默认 14 天）
);

create index if not exists idx_search_cache_hits    on public.search_cache(hit_count desc);
create index if not exists idx_search_cache_expires on public.search_cache(expires_at);

alter table public.search_cache enable row level security;
-- 故意不建 policy：仅 service-role 可访问。

-- 原子自增命中次数（避免读-改-写竞态）；缓存命中时由后端 fire-and-forget 调用。
create or replace function public.increment_search_hit(p_query_hash text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.search_cache
     set hit_count = hit_count + 1
   where query_hash = p_query_hash;
$$;

-- ── 只读分享快照（公开论文 / 论文库）─────────────────────────
-- 同样是「服务端 service-role 读写、无 RLS policy」的表：客户端永远碰不到，
-- 由 /api/share* 路由代为读写。snapshot 是点击分享那一刻的 JSON 副本，
-- 与本地后续编辑解耦（见 lib/share/snapshot.ts）。owner_id 可空（纯本地用户也能分享）。
create table if not exists public.shares (
  token       text primary key,                 -- lib/share/snapshot.ts 的 genShareToken()
  kind        text not null,                    -- 'paper' | 'library'
  title       text not null default '',
  snapshot    jsonb not null,
  owner_id    uuid references auth.users(id) on delete set null,
  view_count  integer not null default 0,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz                        -- null = 永不过期
);

create index if not exists idx_shares_created on public.shares(created_at desc);

alter table public.shares enable row level security;
-- 故意不建 policy：仅 service-role 可访问（公开读取经 /api/share/[token] 服务端代理）。

-- 原子自增浏览量（公开页打开时由后端 fire-and-forget 调用）。
create or replace function public.increment_share_view(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.shares
     set view_count = view_count + 1
   where token = p_token;
$$;
