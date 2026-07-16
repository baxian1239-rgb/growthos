import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateSalesAIAnalysis, type SalesAIAnalysis, type SalesLeadInput } from "@/lib/ai/sales-assistant";

type SalesLeadRecord = SalesLeadInput & {
  sales_ai_analysis: SalesAIAnalysis | null;
};

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase server credentials are not configured" }, { status: 500 });
  }

  const { id } = await params;
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const result = await client
    .from("growth_leads")
    .select("company_name,industry,company_size,total_score,growth_level,lead_status,sales_note,ai_report,sales_ai_analysis")
    .eq("id", id)
    .single();

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  const lead = result.data as SalesLeadRecord;
  const analysis = lead.sales_ai_analysis || generateSalesAIAnalysis(lead);

  if (!lead.sales_ai_analysis) {
    const saveResult = await client.from("growth_leads").update({ sales_ai_analysis: analysis }).eq("id", id);
    if (saveResult.error) return NextResponse.json({ error: saveResult.error.message }, { status: 500 });
  }

  return NextResponse.json({ analysis });
}
