alter table public.growth_leads
add column if not exists first_wechat_script jsonb;
