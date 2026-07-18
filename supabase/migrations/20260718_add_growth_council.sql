create table if not exists public.ai_agents (
  id text primary key,
  name text not null,
  role text not null,
  source text,
  external_project text,
  external_entrypoints jsonb not null default '[]'::jsonb,
  integration_mode text not null default 'embedded-workflow',
  license text,
  mission text,
  system_prompt text not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.ai_council_analyses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  assessment_id uuid,
  lead_id uuid,
  growth_index integer,
  growth_level text,
  input_snapshot jsonb not null default '{}'::jsonb,
  council_report jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.growth_tasks (
  id uuid primary key default gen_random_uuid(),
  council_analysis_id uuid references public.ai_council_analyses(id) on delete cascade,
  company_id uuid,
  title text not null,
  owner_role text,
  phase text not null,
  status text not null default 'todo',
  due_date date,
  evidence text,
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.growth_memory (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  source_type text not null default 'council_analysis',
  problem text not null,
  solution text,
  result text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ai_agents enable row level security;
alter table public.ai_council_analyses enable row level security;
alter table public.growth_tasks enable row level security;
alter table public.growth_memory enable row level security;

create policy "public can read ai agents" on public.ai_agents for select to anon using (true);
create policy "public can insert council analyses" on public.ai_council_analyses for insert to anon with check (true);
create policy "public can read council analyses" on public.ai_council_analyses for select to anon using (true);
create policy "public can insert growth tasks" on public.growth_tasks for insert to anon with check (true);
create policy "public can read growth tasks" on public.growth_tasks for select to anon using (true);
create policy "public can insert growth memory" on public.growth_memory for insert to anon with check (true);
create policy "public can read growth memory" on public.growth_memory for select to anon using (true);

insert into public.ai_agents (id, name, role, source, external_project, external_entrypoints, integration_mode, license, mission, system_prompt)
values
  ('strategy', '增长战略顾问', 'Chief Growth Strategist', 'dbskill business diagnosis + gstack CEO review', 'dbskill,gstack', '["/dbs-diagnosis","/dbs-benchmark","/dbs-good-question","/office-hours","/plan-ceo-review"]'::jsonb, 'external-adapter', 'CC BY-NC 4.0 / MIT', '判断企业当前阶段、核心瓶颈和增长优先级。', '你是一名企业增长战略顾问。基于企业信息、测评分数和增长瓶颈，判断增长阶段、根因、优先级和未来90天战略重点。'),
  ('marketing', '获客增长顾问', 'Growth Marketing Advisor', 'dbskill content skills + GrowthOS acquisition model', 'dbskill,growthos', '["/dbs-content","/dbs-hook","/dbs-spread","/office-hours","/plan-ceo-review"]'::jsonb, 'external-adapter', 'CC BY-NC 4.0 / MIT', '设计低成本、高ROI、可复用的获客系统。', '你是一名增长营销顾问。重点分析流量来源、内容IP、渠道组合、私域承接和90天获客实验。'),
  ('sales', '成交增长顾问', 'Sales Advisor', 'dbskill diagnosis + gstack QA/review', 'dbskill,gstack,growthos', '["/dbs-diagnosis","/dbs-action","/dbs-deconstruct","/review","/qa"]'::jsonb, 'external-adapter', 'CC BY-NC 4.0 / MIT', '提升从咨询到成交、复购的转化效率。', '你是一名销售增长顾问。分析获客、咨询、信任、成交、复购链路，找出成交损失点。'),
  ('product', '产品增长顾问', 'Product Advisor', 'gstack product workflow', 'gstack,dbskill', '["/dbs-diagnosis","/dbs-benchmark","/plan-ceo-review","/plan-design-review","/plan-eng-review"]'::jsonb, 'embedded-workflow', 'MIT / CC BY-NC 4.0', '优化产品定位、定价、价值表达和交付结构。', '你是一名产品战略顾问。判断产品是否清晰解决客户问题，分析定位、定价、套餐、交付和差异化。'),
  ('operations', '企业运营顾问', 'Operations Advisor', 'gstack execution workflow', 'gstack,dbskill', '["/dbs-action","/dbs-decision","/dbs-save","/autoplan","/review","/document-release"]'::jsonb, 'embedded-workflow', 'MIT / CC BY-NC 4.0', '把增长动作沉淀成团队可执行的流程和SOP。', '你是一名企业运营顾问。分析企业如何从依赖老板推动，升级为依靠流程、责任人、节奏和数据看板持续运转。'),
  ('finance', '盈利模型顾问', 'Business Model Advisor', 'business model analysis + gstack benchmark', 'dbskill,gstack,growthos', '["/dbs-diagnosis","/dbs-benchmark","/dbs-decision","/plan-eng-review","/benchmark"]'::jsonb, 'external-adapter', 'CC BY-NC 4.0 / MIT', '判断增长是否赚钱，优化收入、成本、利润和ROI。', '你是一名商业模式顾问。分析收入结构、成本结构、利润来源、客户价值和ROI。'),
  ('coach', '增长执行教练', 'Growth Coach', 'gstack review, ship, retro and learn', 'gstack,dbskill', '["/dbs-action","/dbs-slowisfast","/dbs-report","/qa","/ship","/retro","/learn"]'::jsonb, 'embedded-workflow', 'MIT / CC BY-NC 4.0', '把90天计划拆成月、周、日动作，并推动复盘。', '你是一名企业增长执行教练。把目标拆成可检查任务，并建立周复盘、问题记录和调整机制。')
on conflict (id) do update set
  name = excluded.name,
  role = excluded.role,
  source = excluded.source,
  external_project = excluded.external_project,
  external_entrypoints = excluded.external_entrypoints,
  integration_mode = excluded.integration_mode,
  license = excluded.license,
  mission = excluded.mission,
  system_prompt = excluded.system_prompt,
  status = 'active';
