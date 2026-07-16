import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return new NextResponse("Supabase 未配置", { status: 500 });
  const client = createClient(url, key);
  let { data, error } = await client.from("growth_leads").select("company_name,industry,company_size,contact_name,phone,wechat,total_score,growth_level,created_at,lead_status,sales_note").order("created_at", { ascending: false });
  if (error?.message.includes("lead_status") || error?.message.includes("sales_note")) {
    const fallback = await client.from("growth_leads").select("company_name,industry,company_size,contact_name,phone,wechat,total_score,growth_level,created_at").order("created_at", { ascending: false });
    data = (fallback.data || []).map((lead) => ({ ...lead, lead_status: "new", sales_note: "" }));
    error = fallback.error;
  }
  if (error) return new NextResponse(error.message, { status: 500 });
  const headers = ["企业名称", "行业", "企业规模", "联系人", "手机号", "微信号", "增长指数", "增长阶段", "提交时间", "客户状态", "销售备注"];
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = "\uFEFF" + [headers.join(","), ...(data || []).map((lead) => [lead.company_name, lead.industry, lead.company_size, lead.contact_name, lead.phone, lead.wechat, lead.total_score, lead.growth_level, lead.created_at, lead.lead_status, lead.sales_note].map(escape).join(","))].join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="growth-leads.xls.csv"' } });
}
