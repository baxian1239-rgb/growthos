create table if not exists public.assessment_records (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  company text not null,
  industry text not null,
  employees text not null,
  revenue text not null,
  answers jsonb not null,
  score integer not null,
  level text not null,
  engine_scores jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.assessment_records enable row level security;
create policy "public can insert assessments" on public.assessment_records for insert to anon with check (true);
create policy "public can read assessments" on public.assessment_records for select to anon using (true);

create table if not exists public.growth_leads (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  industry text,
  company_size text,
  contact_name text not null,
  phone text not null,
  wechat text,
  total_score integer not null,
  growth_level text not null,
  ai_report jsonb,
  lead_status text not null default 'new',
  sales_note text,
  sales_ai_analysis jsonb,
  first_wechat_script jsonb,
  follow_up_records jsonb not null default '[]'::jsonb,
  next_follow_up_advice jsonb,
  consult_status text not null default 'pending',
  created_at timestamptz not null default now()
);
alter table public.growth_leads add column if not exists ai_report jsonb;
alter table public.growth_leads add column if not exists lead_status text not null default 'new';
alter table public.growth_leads add column if not exists sales_note text;
alter table public.growth_leads add column if not exists sales_ai_analysis jsonb;
alter table public.growth_leads add column if not exists first_wechat_script jsonb;
alter table public.growth_leads add column if not exists follow_up_records jsonb not null default '[]'::jsonb;
alter table public.growth_leads add column if not exists next_follow_up_advice jsonb;
alter table public.growth_leads add column if not exists consult_status text not null default 'pending';
alter table public.growth_leads enable row level security;
create policy "public can insert growth leads" on public.growth_leads for insert to anon with check (true);
