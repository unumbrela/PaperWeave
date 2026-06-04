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
