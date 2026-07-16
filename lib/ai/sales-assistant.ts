import type { GeneratedGrowthReport } from "./report-generator";

export type SalesCustomerLevel = "高意向" | "中意向" | "低意向";

export const LEAD_STATUSES = ["new", "contacted", "communicating", "qualified", "proposal", "won", "lost"] as const;
export type LeadStatus = typeof LEAD_STATUSES[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "新客户",
  contacted: "已联系",
  communicating: "沟通中",
  qualified: "已确认需求",
  proposal: "方案阶段",
  won: "已成交",
  lost: "已流失",
};

export type SalesAIAnalysis = {
  customer_level: SalesCustomerLevel;
  core_problem: string;
  sales_strategy: string;
  first_message: string;
  customer_profile?: Record<string, unknown> | string;
  communication_strategy?: string;
  first_wechat_script?: string;
  strategy?: string;
};

export type FirstWechatScript = {
  opening: string;
  pain_point: string;
  value_introduction: string;
  next_action: string;
  generated_at: string;
};

export type FollowUpRecord = {
  id: string;
  content: string;
  status: LeadStatus;
  created_at: string;
};

export type NextFollowUpAdvice = {
  current_status: string;
  recommended_time: string;
  communication_strategy: string;
  wechat_message: string;
  generated_at: string;
};

export type SalesLeadInput = {
  company_name: string;
  industry?: string | null;
  company_size?: string | null;
  total_score: number;
  growth_level: string;
  lead_status?: LeadStatus | string | null;
  sales_note?: string | null;
  ai_report?: GeneratedGrowthReport | null;
  wechat?: string | null;
};

export type FollowUpRecommendation = {
  action: string;
  reason: string;
};

export function normalizeLeadStatus(status?: string | null): LeadStatus {
  return LEAD_STATUSES.includes(status as LeadStatus) ? status as LeadStatus : "new";
}

export function getLeadStatusLabel(status?: string | null) {
  return LEAD_STATUS_LABELS[normalizeLeadStatus(status)];
}

export function getRecommendedFollowUpTime(status?: string | null) {
  const normalizedStatus = normalizeLeadStatus(status);
  const recommendations: Record<LeadStatus, string> = {
    new: "2小时内完成首次联系",
    contacted: "24小时内进行第二次沟通",
    communicating: "48小时内确认核心需求",
    qualified: "今天内推进90天方案沟通",
    proposal: "24小时内确认方案反馈",
    won: "7天内完成交付回访",
    lost: "30天后进行价值唤醒",
  };
  return recommendations[normalizedStatus];
}

function companySizeWeight(size?: string | null) {
  if (!size) return 0;
  if (/大型|集团|500人以上/.test(size)) return 2;
  const numbers = size.match(/\d+/g)?.map(Number) ?? [];
  const maximum = numbers.length ? Math.max(...numbers) : 0;
  if (maximum >= 50) return 2;
  if (maximum >= 10) return 1;
  return 0;
}

export function getCustomerLevel(input: SalesLeadInput): SalesCustomerLevel {
  if (input.lead_status === "qualified") return "高意向";

  const scoreWeight = input.total_score >= 70 ? 2 : input.total_score >= 40 ? 1 : 0;
  const reportWeight = input.ai_report ? 1 : 0;
  const intentionScore = scoreWeight + reportWeight + companySizeWeight(input.company_size);

  if (intentionScore >= 4) return "高意向";
  if (intentionScore >= 2) return "中意向";
  return "低意向";
}

export function getCustomerLevelReason(input: SalesLeadInput, level = getCustomerLevel(input)) {
  if (input.lead_status === "qualified") return "已主动提交增长咨询，企业存在明确增长需求，建议优先联系。";
  if (level === "高意向") return "企业增长指数和规模基础较好，并已形成完整诊断报告，具备进一步咨询价值。";
  if (level === "中意向") return "企业已完成增长诊断并暴露出改善需求，适合通过专业沟通进一步确认决策意愿。";
  return "客户目前处于初步了解阶段，建议先提供有价值的诊断解读，逐步建立信任。";
}

export function getDealScore(input: SalesLeadInput) {
  const level = getCustomerLevel(input);
  const painWeight = input.total_score < 40 ? 20 : input.total_score < 70 ? 18 : 10;
  const consultationWeight = input.lead_status === "qualified" ? 35 : 12;
  const reportWeight = input.ai_report ? 12 : 0;
  const contactWeight = input.wechat ? 5 : 2;
  const rawScore = 18 + painWeight + consultationWeight + reportWeight + companySizeWeight(input.company_size) * 4 + contactWeight;

  if (level === "高意向") return Math.min(95, Math.max(80, rawScore));
  if (level === "中意向") return Math.min(79, Math.max(55, rawScore));
  return Math.min(54, Math.max(25, rawScore));
}

export function getFollowUpRecommendation(input: SalesLeadInput): FollowUpRecommendation {
  const status = normalizeLeadStatus(input.lead_status);
  const level = getCustomerLevel(input);
  const primaryProblem = getCoreProblems(input)[0];

  if (status === "won") {
    return { action: "7天内完成交付回访", reason: "客户已成交，建议及时确认交付体验并寻找增购或转介绍机会。" };
  }
  if (status === "lost") {
    return { action: "30天后重新激活", reason: `围绕“${primaryProblem}”提供新的案例或价值信息，避免高频打扰。` };
  }
  if (status === "proposal") {
    return { action: "24小时内确认方案反馈", reason: "客户已进入方案阶段，应及时处理异议并明确决策时间。" };
  }
  if (status === "communicating") {
    return { action: "48小时内确认核心需求", reason: `沟通已建立，下一步需要围绕“${primaryProblem}”确认优先级和决策条件。` };
  }
  if (status === "contacted") {
    return { action: "24小时内进行第二次沟通", reason: "已完成首次接触，建议通过诊断解读继续建立专业信任。" };
  }

  if (level === "高意向") {
    return {
      action: "3小时内微信沟通",
      reason: input.lead_status === "qualified"
        ? `客户已主动提交增长咨询，并明确暴露“${primaryProblem}”需求。`
        : `客户已完成诊断并领取增长方案，“${primaryProblem}”需求较明确。`,
    };
  }

  if (level === "中意向") {
    return {
      action: "24小时内发送诊断解读",
      reason: `客户已完成企业评测，建议围绕“${primaryProblem}”提供针对性价值并确认决策意愿。`,
    };
  }

  return {
    action: "3天内进行价值培育",
    reason: "客户仍处于初步了解阶段，建议先发送案例或增长方法，逐步建立信任。",
  };
}

export function getCoreProblems(input: SalesLeadInput) {
  const reportData = input.ai_report && typeof input.ai_report === "object"
    ? input.ai_report as GeneratedGrowthReport & Record<string, unknown>
    : null;
  const rawBottlenecks = reportData?.topBottlenecks;
  const reportProblems = (Array.isArray(rawBottlenecks)
    ? rawBottlenecks
    : rawBottlenecks && typeof rawBottlenecks === "object"
      ? Object.values(rawBottlenecks as Record<string, unknown>)
      : rawBottlenecks
        ? [rawBottlenecks]
        : [])
    .map((item) => {
      if (typeof item === "string") return item;
      if (!item || typeof item !== "object") return "";
      const bottleneck = item as Record<string, unknown>;
      return String(bottleneck.name || bottleneck.problem || bottleneck.description || "");
    })
    .filter(Boolean)
    .slice(0, 3);

  if (reportProblems?.length) return reportProblems;

  const noteProblem = input.sales_note?.replace(/^当前最大增长问题：/, "").trim();
  if (noteProblem) return [noteProblem, "成交转化效率有待提升", "增长动作尚未形成稳定体系"];

  return ["客户经营体系不足", "成交转化效率较低", "产品价值表达需要进一步清晰"];
}

export function generateSalesAIAnalysis(input: SalesLeadInput): SalesAIAnalysis {
  const customerLevel = getCustomerLevel(input);
  const coreProblems = getCoreProblems(input);
  const primaryProblem = coreProblems[0];

  return {
    customer_level: customerLevel,
    core_problem: coreProblems.join("；"),
    sales_strategy: `第一次沟通以建立信任为目标，不直接销售。围绕“${primaryProblem}”展开交流，并询问：“您目前企业增长过程中，最大的挑战是什么？”第二次沟通结合客户反馈和诊断结果，引导客户进入90天增长方案。`,
    first_message: `您好，我是企业增长顾问。\n\n看到您刚完成企业增长诊断，AI分析发现贵企业目前在【${primaryProblem}】方面存在提升空间。\n\n想了解一下，目前企业增长最大的挑战是什么？`,
  };
}

export function generateFallbackFollowUpAdvice(input: SalesLeadInput): NextFollowUpAdvice {
  const status = getLeadStatusLabel(input.lead_status);
  const primaryProblem = getCoreProblems(input)[0];

  return {
    current_status: `客户当前处于「${status}」阶段，核心关注点为“${primaryProblem}”。`,
    recommended_time: getRecommendedFollowUpTime(input.lead_status),
    communication_strategy: `围绕“${primaryProblem}”确认客户真实场景、决策优先级和预期结果，先提供诊断价值，再推进下一步方案。`,
    wechat_message: `您好，结合贵企业的增长诊断结果，我进一步梳理了“${primaryProblem}”对当前增长的影响。想和您确认一下，这个问题目前最直接影响的是获客、成交，还是团队执行？我可以基于您的实际情况给您一份更具体的下一步建议。`,
    generated_at: new Date().toISOString(),
  };
}
