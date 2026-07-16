import type { GeneratedGrowthReport } from "./report-generator";

export type GrowthServiceId = "blue-ocean-traffic" | "private-domain-sales" | "growth-coaching";

export type GrowthServiceRecommendation = {
  id: GrowthServiceId;
  name: string;
  suitableFor: string;
  signals: string[];
  solution: string;
  problems: string[];
  reason: string;
  matchScore: number;
};

export type GrowthServiceInput = {
  growthIndex: number;
  growthLevel: string;
  scores: Record<string, number>;
  bottlenecks: string[];
  report?: GeneratedGrowthReport | null;
};

const serviceLibrary = {
  traffic: {
    id: "blue-ocean-traffic" as const,
    name: "蓝海流量模型",
    suitableFor: "流量获取不足",
    signals: ["获客渠道单一", "新客户增长困难", "缺少稳定流量来源"],
    solution: "帮助企业建立持续获客系统。",
    problems: ["建立多渠道获客系统", "形成稳定线索来源", "降低获客成本波动"],
  },
  privateDomain: {
    id: "private-domain-sales" as const,
    name: "私域成交增长模型",
    suitableFor: "客户转化不足",
    signals: ["有流量但成交低", "客户复购不足", "私域运营能力弱"],
    solution: "提升客户转化和成交能力。",
    problems: ["提升客户转化", "建立成交流程", "提升复购能力"],
  },
  coaching: {
    id: "growth-coaching" as const,
    name: "企业增长陪跑方案",
    suitableFor: "企业整体增长瓶颈",
    signals: ["战略不清晰", "团队执行不足", "缺少增长体系"],
    solution: "陪伴企业完成90天增长落地。",
    problems: ["明确增长战略", "建立团队执行机制", "完成90天增长落地"],
  },
};

function capabilityScore(scores: Record<string, number>, aliases: string[]) {
  const entry = Object.entries(scores).find(([name]) => aliases.some((alias) => name.includes(alias)));
  return entry ? Number(entry[1]) : null;
}

function capabilityNeed(score: number | null) {
  if (score === null || !Number.isFinite(score)) return 4;
  const maximum = score > 20 ? 100 : 16;
  return Math.max(0, maximum - score) / maximum * 20;
}

function reportText(input: GrowthServiceInput) {
  const report = input.report as (GeneratedGrowthReport & Record<string, unknown>) | null | undefined;
  const reportBottlenecks = Array.isArray(report?.topBottlenecks)
    ? report.topBottlenecks.map((item) => `${item.name} ${item.problem} ${item.impact}`)
    : [];
  return [input.growthLevel, ...input.bottlenecks, ...reportBottlenecks, String(report?.currentGrowthState || "")].join(" ");
}

function textWeight(text: string, keywords: string[]) {
  return keywords.reduce((weight, keyword) => weight + (text.includes(keyword) ? 6 : 0), 0);
}

function scoreText(score: number | null) {
  return score === null ? "评分信息不足" : `当前评分为${score}分`;
}

export function recommendGrowthServices(input: GrowthServiceInput): GrowthServiceRecommendation[] {
  const text = reportText(input);
  const trafficScore = capabilityScore(input.scores, ["流量获取", "获客", "流量"]);
  const conversionScore = capabilityScore(input.scores, ["成交转化", "成交", "转化"]);
  const customerScore = capabilityScore(input.scores, ["客户经营", "客户", "复购", "私域"]);
  const strategyScore = capabilityScore(input.scores, ["战略定位", "战略"]);
  const organizationScore = capabilityScore(input.scores, ["组织复制", "组织", "团队"]);

  const trafficMatch = capabilityNeed(trafficScore) + textWeight(text, ["流量", "获客", "渠道", "新客户"]);
  const privateDomainMatch = (capabilityNeed(conversionScore) + capabilityNeed(customerScore)) / 2
    + textWeight(text, ["成交", "转化", "客户经营", "复购", "私域"]);
  const overallNeed = Math.max(0, 100 - input.growthIndex) / 4;
  const coachingMatch = overallNeed + (capabilityNeed(strategyScore) + capabilityNeed(organizationScore)) / 2
    + textWeight(text, ["战略", "组织", "团队", "体系", "执行"]);

  const privateDomainCapability = customerScore !== null && (conversionScore === null || customerScore <= conversionScore)
    ? { name: "客户经营能力", score: customerScore }
    : { name: "成交转化能力", score: conversionScore };

  return [
    {
      ...serviceLibrary.traffic,
      reason: `AI分析显示，您的企业「流量获取能力」${scoreText(trafficScore)}，建议优先建立更稳定、多元的获客来源。`,
      matchScore: trafficMatch,
    },
    {
      ...serviceLibrary.privateDomain,
      reason: `AI分析显示，您的企业「${privateDomainCapability.name}」${scoreText(privateDomainCapability.score)}，建议优先优化私域成交与客户复购体系。`,
      matchScore: privateDomainMatch,
    },
    {
      ...serviceLibrary.coaching,
      reason: `企业增长指数为${input.growthIndex}，处于「${input.growthLevel}」，建议通过90天陪跑同步改善战略、团队执行和增长系统。`,
      matchScore: coachingMatch,
    },
  ].sort((first, second) => second.matchScore - first.matchScore);
}
