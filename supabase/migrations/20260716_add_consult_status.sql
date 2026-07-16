alter table public.growth_leads
add column if not exists consult_status text not null default 'pending';
