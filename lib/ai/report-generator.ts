export type CompanyInfoInput = {
  company?: string;
  company_name?: string;
  industry?: string;
  employees?: string;
  company_size?: string;
};

export type AIReportInput = {
  company_info?: CompanyInfoInput;
  answers?: Record<number, number>;
  scores: Record<string, number>;
  growth_level: string;
  growth_index: number;
  strengths?: string[];
  bottlenecks?: string[];
};

export type GrowthIndexAnalysis = {
  growth_index: number;
  growth_level: string;
  summary: string;
};

export type CapabilityAnalysis = {
  name: string;
  score: number;
  interpretation: string;
};

export type GrowthBottleneck = {
  name: string;
  problem: string;
  impact: string;
  suggestion: string;
};

export type NinetyDayGrowthPath = {
  days0To30: string[];
  days30To60: string[];
  days60To90: string[];
};

export type GeneratedGrowthReport = {
  growthIndexAnalysis: GrowthIndexAnalysis;
  currentGrowthState: string;
  capabilityAnalysis: CapabilityAnalysis[];
  topBottlenecks: GrowthBottleneck[];
  ninetyDayPath: NinetyDayGrowthPath;
  aiGrowthAdvice: string[];
};

function pickEntries(scores: Record<string, number>, direction: "high" | "low", count: number) {
  return Object.entries(scores)
    .sort((a, b) => (direction === "high" ? b[1] - a[1] : a[1] - b[1]))
    .slice(0, count)
    .map(([name]) => name);
}

function normalizeList(items: string[] | undefined, fallback: string[]) {
  return items?.length ? items : fallback;
}

function scoreInterpretation(score: number) {
  if (score >= 14) return "该能力已具备较强基础，可作为增长放大的核心支点。";
  if (score >= 10) return "该能力处于可用阶段，但仍需要通过流程、数据和团队动作进一步固化。";
  if (score >= 6) return "该能力存在明显短板，会影响增长链路的稳定性和转化效率。";
  return "该能力仍处于起步阶段，需要优先建立基本方法、负责人和复盘机制。";
}

function indexSummary(index: number, level: string) {
  if (index >= 90) {
    return `企业增长指数为 ${index}，处于「${level}」。企业已经具备较成熟的增长系统，下一阶段重点是规模化复制和持续提高组织效率。`;
  }
  if (index >= 70) {
    return `企业增长指数为 ${index}，处于「${level}」。企业已经形成较好的增长基础，需要把有效经验沉淀为流程、数据和团队能力。`;
  }
  if (index >= 40) {
    return `企业增长指数为 ${index}，处于「${level}」。企业具备部分增长能力，但关键链路尚不稳定，需要集中突破主要瓶颈。`;
  }
  return `企业增长指数为 ${index}，处于「${level}」。企业需要先建立清晰定位、获客成交路径和基础运营机制。`;
}

export function generateMockGrowthReport(input: AIReportInput): GeneratedGrowthReport {
  const companyName = input.company_info?.company || input.company_info?.company_name || "该企业";
  const industry = input.company_info?.industry || "当前行业";
  const strengths = normalizeList(input.strengths, pickEntries(input.scores, "high", 3));
  const bottlenecks = normalizeList(input.bottlenecks, pickEntries(input.scores, "low", 3)).slice(0, 3);
  const [firstBottleneck = "战略定位力", secondBottleneck = "流量获取力", thirdBottleneck = "成交转化力"] =
    bottlenecks;

  return {
    growthIndexAnalysis: {
      growth_index: input.growth_index,
      growth_level: input.growth_level,
      summary: indexSummary(input.growth_index, input.growth_level),
    },
    currentGrowthState: `${companyName}目前在${industry}场景下已经积累了一定经营基础。结合七大能力评分来看，企业的优势主要集中在${strengths.join("、")}，但${bottlenecks.join("、")}正在限制增长效率。现阶段最重要的不是同时做很多动作，而是围绕主要瓶颈建立清晰目标、责任人、指标看板和周度复盘节奏。`,
    capabilityAnalysis: Object.entries(input.scores).map(([name, score]) => ({
      name,
      score,
      interpretation: scoreInterpretation(score),
    })),
    topBottlenecks: bottlenecks.map((name) => ({
      name,
      problem: `${name}当前还没有形成稳定、可复制的执行体系，容易依赖个人经验或临时推进。`,
      impact: `该问题会直接影响企业增长链路的连续性，导致获客、成交、交付或复购环节出现波动，降低整体增长确定性。`,
      suggestion: `建议为${name}设置明确负责人和核心指标，用每周复盘的方式沉淀方法论，并逐步固化为团队可执行的SOP。`,
    })),
    ninetyDayPath: {
      days0To30: [
        `围绕${firstBottleneck}完成问题拆解，明确最关键的增长目标和衡量指标。`,
        "梳理现有客户、渠道、成交和交付数据，找出影响增长的前两个关键断点。",
        "建立每周一次的增长复盘会议，确保所有行动都能被记录、追踪和调整。",
      ],
      days30To60: [
        `针对${secondBottleneck}设计2到3个增长实验，例如内容获客、私域转化或销售话术优化。`,
        "把有效动作整理成标准模板，降低团队执行难度。",
        "开始建立基础数据看板，重点追踪线索量、咨询量、成交率和客户反馈。",
      ],
      days60To90: [
        `围绕${thirdBottleneck}固化验证有效的增长动作，形成可复制流程。`,
        "将增长SOP交给团队执行，并设置明确的岗位责任和复盘标准。",
        "评估下一轮增长目标，决定继续放大优势能力还是优先修复新的瓶颈能力。",
      ],
    },
    aiGrowthAdvice: [
      `使用AI整理${industry}客户常见痛点，生成内容选题、销售问答和客户跟进素材。`,
      "使用AI辅助分析成交与流失原因，把高频问题沉淀为标准话术和销售训练材料。",
      "使用AI生成周度经营摘要，持续追踪获客、成交、交付和复购数据变化。",
      "使用AI把优秀员工的经验转化为流程清单、培训文档和复盘模板，提升组织复制效率。",
    ],
  };
}
