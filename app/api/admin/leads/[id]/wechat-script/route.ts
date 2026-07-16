import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAIReportProvider } from "@/lib/ai/providers";
import { normalizeAIChatReply, type AIChatContext } from "@/lib/ai/providers/types";
import { generateSalesAIAnalysis, getCoreProblems, type FirstWechatScript, type SalesLeadInput } from "@/lib/ai/sales-assistant";
import type { GeneratedGrowthReport } from "@/lib/ai/report-generator";

type WechatLeadRecord = SalesLeadInput & {
  contact_name: string;
  first_wechat_script: FirstWechatScript | null;
};

function capabilityScores(report: GeneratedGrowthReport | null) {
  if (!report || !Array.isArray(report.capabilityAnalysis)) return {};
  return Object.fromEntries(report.capabilityAnalysis.map((item) => [item.name, Number(item.score) || 0]));
}

function firstPlanAction(reply: ReturnType<typeof normalizeAIChatReply>) {
  return reply.ninetyDayPlan.days1_30?.[0]?.actions?.[0]
    || reply.ninetyDayPlan.days31_60?.[0]?.actions?.[0]
    || "安排一次20分钟沟通，共同确认当前最优先的增长问题";
}

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
    .select("company_name,industry,company_size,contact_name,total_score,growth_level,lead_status,sales_note,ai_report,first_wechat_script")
    .eq("id", id)
    .single();

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });

  const lead = result.data as WechatLeadRecord;
  const report = lead.ai_report && typeof lead.ai_report === "object" ? lead.ai_report : null;
  const coreProblems = getCoreProblems(lead);
  const fallbackAnalysis = generateSalesAIAnalysis(lead);
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

  let script: FirstWechatScript;

  try {
    const reply = normalizeAIChatReply(await provider.generateChatReply(context, [{
      role: "user",
      content: `请基于${lead.company_name}的企业信息和诊断报告，为销售生成首次微信沟通方案。重点围绕核心问题：${coreProblems.join("、")}。沟通语气专业、自然，不强行销售，并给出清晰的下一步行动。`,
    }]));
    script = {
      opening: `您好，我是企业增长顾问。看到贵企业刚完成GrowthOS企业增长诊断，想和您交流一下诊断结果。`,
      pain_point: `AI诊断显示，贵企业当前最需要关注的是“${reply.priorityProblem}”。${reply.reason}`,
      value_introduction: `针对这个问题，我们会结合企业增长指数、能力评分和实际经营场景，协助梳理可执行的90天增长路径。${reply.impact}`,
      next_action: `${firstPlanAction(reply)}。如果方便，我们可以先安排一次简短沟通，确认贵企业当前最优先的增长目标。`,
      generated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[wechat-script] provider fallback", {
      provider: provider.name,
      model: provider.model,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    script = {
      opening: fallbackAnalysis.first_message.split("\n\n")[0] || "您好，我是企业增长顾问。",
      pain_point: `结合本次诊断，贵企业当前需要优先关注“${coreProblems[0]}”。`,
      value_introduction: "我们可以基于企业增长指数和七大能力评分，进一步拆解关键瓶颈并制定90天执行路径。",
      next_action: "如果方便，建议安排一次20分钟沟通，先确认当前最关键的增长问题和下一步目标。",
      generated_at: new Date().toISOString(),
    };
  }

  const saveResult = await client.from("growth_leads").update({ first_wechat_script: script }).eq("id", id);
  if (saveResult.error) return NextResponse.json({ error: saveResult.error.message }, { status: 500 });

  return NextResponse.json({ script, meta: { provider: provider.name, model: provider.model } });
}
