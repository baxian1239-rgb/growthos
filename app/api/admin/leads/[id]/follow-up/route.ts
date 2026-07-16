import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAIReportProvider } from "@/lib/ai/providers";
import { normalizeAIChatReply, type AIChatContext } from "@/lib/ai/providers/types";
import {
  generateFallbackFollowUpAdvice,
  getCoreProblems,
  getLeadStatusLabel,
  getRecommendedFollowUpTime,
  normalizeLeadStatus,
  type FirstWechatScript,
  type FollowUpRecord,
  type NextFollowUpAdvice,
  type SalesLeadInput,
} from "@/lib/ai/sales-assistant";
import type { GeneratedGrowthReport } from "@/lib/ai/report-generator";

type FollowUpLeadRecord = SalesLeadInput & {
  contact_name: string;
  first_wechat_script: FirstWechatScript | null;
  follow_up_records: FollowUpRecord[] | null;
  next_follow_up_advice: NextFollowUpAdvice | null;
};

type FollowUpRequest = {
  action?: "generate" | "record" | "status";
  content?: string;
  status?: string;
};

function capabilityScores(report: GeneratedGrowthReport | null) {
  if (!report || !Array.isArray(report.capabilityAnalysis)) return {};
  return Object.fromEntries(report.capabilityAnalysis.map((item) => [item.name, Number(item.score) || 0]));
}

function firstPlanAction(reply: ReturnType<typeof normalizeAIChatReply>) {
  return reply.ninetyDayPlan.days1_30?.[0]?.actions?.[0]
    || reply.ninetyDayPlan.days31_60?.[0]?.actions?.[0]
    || "确认客户当前最优先的增长目标";
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase server credentials are not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({})) as FollowUpRequest;
  const { id } = await params;
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const result = await client
    .from("growth_leads")
    .select("company_name,industry,company_size,contact_name,total_score,growth_level,lead_status,sales_note,ai_report,first_wechat_script,follow_up_records,next_follow_up_advice")
    .eq("id", id)
    .single();

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });

  const lead = result.data as FollowUpLeadRecord;
  const status = normalizeLeadStatus(body.status || lead.lead_status);
  const records = Array.isArray(lead.follow_up_records) ? lead.follow_up_records : [];

  if (body.action === "status") {
    const saveResult = await client.from("growth_leads").update({ lead_status: status }).eq("id", id);
    if (saveResult.error) return NextResponse.json({ error: saveResult.error.message }, { status: 500 });
    return NextResponse.json({ lead_status: status });
  }

  if (body.action === "record") {
    const content = body.content?.trim();
    if (!content) return NextResponse.json({ error: "请填写销售跟进记录" }, { status: 400 });

    const record: FollowUpRecord = {
      id: randomUUID(),
      content,
      status,
      created_at: new Date().toISOString(),
    };
    const nextRecords = [...records, record];
    const saveResult = await client
      .from("growth_leads")
      .update({ follow_up_records: nextRecords, lead_status: status })
      .eq("id", id);
    if (saveResult.error) return NextResponse.json({ error: saveResult.error.message }, { status: 500 });
    return NextResponse.json({ record, records: nextRecords, lead_status: status });
  }

  const report = lead.ai_report && typeof lead.ai_report === "object" ? lead.ai_report : null;
  const coreProblems = getCoreProblems(lead);
  const provider = getAIReportProvider();
  const context: AIChatContext = {
    companyInfo: {
      company: lead.company_name,
      industry: lead.industry || undefined,
      employees: lead.company_size || undefined,
    },
    answers: {},
    scores: capabilityScores(report),
    growthIndex: lead.total_score,
    growthLevel: lead.growth_level,
    report,
  };

  let advice: NextFollowUpAdvice;

  try {
    const reply = normalizeAIChatReply(await provider.generateChatReply(context, [{
      role: "user",
      content: `请为销售生成该客户的下一步跟进建议。客户状态：${getLeadStatusLabel(status)}；核心问题：${coreProblems.join("、")}；已有跟进记录：${records.map((item) => item.content).join("；") || "暂无"}。请判断当前状态、沟通重点和下一步动作。`,
    }]));
    advice = {
      current_status: `客户当前处于「${getLeadStatusLabel(status)}」阶段，优先关注“${reply.priorityProblem}”。${reply.reason}`,
      recommended_time: getRecommendedFollowUpTime(status),
      communication_strategy: `围绕“${reply.priorityProblem}”确认真实业务影响和决策优先级。${reply.impact}`,
      wechat_message: `您好，结合贵企业的增长诊断，我进一步梳理了“${reply.priorityProblem}”这个问题。想和您确认一下，它目前最直接影响的是获客、成交，还是团队执行？下一步建议先${firstPlanAction(reply)}，我可以结合您的实际情况把动作进一步拆解。`,
      generated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[follow-up] provider fallback", {
      provider: provider.name,
      model: provider.model,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    advice = generateFallbackFollowUpAdvice({ ...lead, lead_status: status });
  }

  const saveResult = await client.from("growth_leads").update({ next_follow_up_advice: advice }).eq("id", id);
  if (saveResult.error) return NextResponse.json({ error: saveResult.error.message }, { status: 500 });

  return NextResponse.json({ advice, meta: { provider: provider.name, model: provider.model } });
}
