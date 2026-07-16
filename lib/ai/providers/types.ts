import type { AIReportInput, GeneratedGrowthReport } from "../report-generator";

export type AIChatContext = {
  companyInfo: Record<string, string | undefined>;
  answers: Record<number, number>;
  scores: Record<string, number>;
  growthIndex: number;
  growthLevel: string;
  report: GeneratedGrowthReport | null;
};

export type AIChatMessage = { role: "user" | "assistant"; content: string };
export type NinetyDayPlanStage = {
  title: string;
  actions: string[];
};

export type NinetyDayPlan = {
  days1_30: NinetyDayPlanStage[];
  days31_60: NinetyDayPlanStage[];
  days61_90: NinetyDayPlanStage[];
};

export type AIChatReply = {
  priorityProblem: string;
  reason: string;
  impact: string;
  ninetyDayPlan: NinetyDayPlan;
};

const DEFAULT_NINETY_DAY_PLAN: NinetyDayPlan = {
  days1_30: [{ title: "基础修复期", actions: ["建立客户跟进流程", "梳理成交路径", "建立数据记录机制"] }],
  days31_60: [{ title: "能力提升期", actions: ["优化获客渠道", "提升转化效率", "打磨产品价值表达"] }],
  days61_90: [{ title: "系统建设期", actions: ["固化增长SOP", "建立团队执行机制", "持续优化数据指标"] }],
};

function toText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toActionList(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(toActionList).filter(Boolean);
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(toActionList).filter(Boolean);
  }
  return [];
}

function normalizeStages(value: unknown, fallback: NinetyDayPlanStage[]): NinetyDayPlanStage[] {
  if (!Array.isArray(value)) {
    const actions = toActionList(value);
    return actions.length ? [{ title: fallback[0].title, actions }] : fallback;
  }

  const stages = value.flatMap((item) => {
    if (typeof item === "string") return [];
    if (!item || typeof item !== "object") return [];
    const stage = item as Record<string, unknown>;
    const actions = toActionList(stage.actions ?? stage.action ?? stage.recommendation);
    return actions.length ? [{ title: toText(stage.title) || fallback[0].title, actions }] : [];
  });
  if (stages.length) return stages;

  const actions = toActionList(value);
  return actions.length ? [{ title: fallback[0].title, actions }] : fallback;
}

export function normalizeAIChatReply(value: unknown): AIChatReply {
  const reply = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const plan = reply.ninetyDayPlan && typeof reply.ninetyDayPlan === "object"
    ? reply.ninetyDayPlan as Record<string, unknown>
    : {};
  const legacyPath = reply.ninetyDayPath && typeof reply.ninetyDayPath === "object"
    ? reply.ninetyDayPath as Record<string, unknown>
    : {};
  const legacyActions = [
    reply.actionPlan,
    reply.action,
    reply.recommendation,
    reply.aiAdvice,
    reply.suggestedActions,
    reply.growthAdvice,
  ].flatMap(toActionList).filter(Boolean);

  return {
    priorityProblem: toText(reply.priorityProblem) || toText(reply.coreProblem) || toActionList(reply.coreProblems)[0] || "请优先解决当前评分最低的增长能力。",
    reason: toText(reply.reason) || toText(reply.why) || toText(reply.currentDiagnosis) || "该问题是当前增长链路中最明显的短板，需要优先处理。",
    impact: toText(reply.impact) || toText(reply.businessImpact) || toText(reply.risk) || "如果不及时优化，会持续影响获客、转化或组织执行效率。",
    ninetyDayPlan: {
      days1_30: normalizeStages(
        plan.days1_30 ?? plan.days0To30 ?? plan["0-30"] ?? legacyPath.days1_30 ?? legacyPath.days0To30 ?? legacyPath["0-30"] ?? legacyActions,
        DEFAULT_NINETY_DAY_PLAN.days1_30
      ),
      days31_60: normalizeStages(
        plan.days31_60 ?? plan.days30To60 ?? plan["30-60"] ?? legacyPath.days31_60 ?? legacyPath.days30To60 ?? legacyPath["30-60"],
        DEFAULT_NINETY_DAY_PLAN.days31_60
      ),
      days61_90: normalizeStages(
        plan.days61_90 ?? plan.days60To90 ?? plan["60-90"] ?? legacyPath.days61_90 ?? legacyPath.days60To90 ?? legacyPath["60-90"],
        DEFAULT_NINETY_DAY_PLAN.days61_90
      ),
    },
  };
}

export type AIProviderName = "openai" | "deepseek" | "qwen";

export type AIReportProvider = {
  name: AIProviderName;
  model: string;
  generateReport(input: AIReportInput): Promise<GeneratedGrowthReport>;
  generateChatReply(context: AIChatContext, messages: AIChatMessage[]): Promise<AIChatReply>;
};
