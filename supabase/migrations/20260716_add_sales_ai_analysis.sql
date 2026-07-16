alter table public.growth_leads
add column if not exists sales_ai_analysis jsonb;
