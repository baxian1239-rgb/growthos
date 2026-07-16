alter table public.growth_leads
add column if not exists lead_status text not null default 'new';

alter table public.growth_leads
add column if not exists follow_up_records jsonb not null default '[]'::jsonb;

alter table public.growth_leads
add column if not exists next_follow_up_advice jsonb;
