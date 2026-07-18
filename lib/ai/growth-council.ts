import type { AIReportInput } from "./report-generator";
import { getAgentSkillMapping, gstackOperatingPipeline } from "./skill-integrations";

export type GrowthCouncilAgentId =
  | "strategy"
  | "marketing"
  | "sales"
  | "product"
  | "operations"
  | "finance"
  | "coach";

export type GrowthCouncilAgent = {
  id: GrowthCouncilAgentId;
  name: string;
  role: string;
  source: string;
  mission: string;
  systemPrompt: string;
};

export type GrowthCouncilInsight = {
  agentId: GrowthCouncilAgentId;
  agentName: string;
  role: string;
  source: string;
  dbskillEntrypoints: string[];
  gstackEntrypoints: string[];
  integrationNote: string;
  diagnosis: string;
  priority: string;
  recommendations: string[];
  nextActions: string[];
};

export type GrowthCouncilPlan = {
  objective: string;
  days0To30: string[];
  days31To60: string[];
  days61To90: string[];
};

export type GrowthCouncilReport = {
  councilName: string;
  summary: string;
  agents: GrowthCouncilInsight[];
  ninetyDayPlan: GrowthCouncilPlan;
  gstackPipeline: typeof gstackOperatingPipeline;
  operatingCadence: string[];
};

export const growthCouncilAgents: GrowthCouncilAgent[] = [
  {
    id: "strategy",
    name: "增长战略顾问",
    role: "Chief Growth Strategist",
    source: "dbskill business diagnosis",
    mission: "判断企业当前阶段、核心瓶颈和增长优先级。",
    systemPrompt:
      "你是一名企业增长战略顾问。基于企业信息、测评分数和增长瓶颈，判断增长阶段、根因、优先级和未来90天战略重点。不要给泛泛建议，必须指出最应该先解决的问题。",
  },
  {
    id: "marketing",
    name: "获客增长顾问",
    role: "Growth Marketing Advisor",
    source: "GrowthOS blue-ocean acquisition model",
    mission: "设计低成本、高ROI、可复用的获客系统。",
    systemPrompt:
      "你是一名增长营销顾问。重点分析流量来源、内容IP、渠道组合、私域承接和90天获客实验。优先选择低成本、高ROI、可持续复盘的动作。",
  },
  {
    id: "sales",
    name: "成交增长顾问",
    role: "Sales Advisor",
    source: "GrowthOS private-domain sales SOP",
    mission: "提升从咨询到成交、复购的转化效率。",
    systemPrompt:
      "你是一名销售增长顾问。分析获客、咨询、信任、成交、复购链路，找出成交损失点，并输出话术、SOP和成交率提升方案。",
  },
  {
    id: "product",
    name: "产品增长顾问",
    role: "Product Advisor",
    source: "gstack product workflow",
    mission: "优化产品定位、定价、价值表达和交付结构。",
    systemPrompt:
      "你是一名产品战略顾问。判断产品是否清晰解决客户问题，分析定位、定价、套餐、交付和差异化，输出更容易成交的产品升级建议。",
  },
  {
    id: "operations",
    name: "企业运营顾问",
    role: "Operations Advisor",
    source: "gstack execution workflow",
    mission: "把增长动作沉淀成团队可执行的流程和SOP。",
    systemPrompt:
      "你是一名企业运营顾问。分析企业如何从依赖老板推动，升级为依靠流程、责任人、节奏和数据看板持续运转。",
  },
  {
    id: "finance",
    name: "盈利模型顾问",
    role: "Business Model Advisor",
    source: "business model analysis",
    mission: "判断增长是否赚钱，优化收入、成本、利润和ROI。",
    systemPrompt:
      "你是一名商业模式顾问。分析收入结构、成本结构、利润来源、客户价值和ROI，指出增长计划中最需要验证的财务假设。",
  },
  {
    id: "coach",
    name: "增长执行教练",
    role: "Growth Coach",
    source: "gstack review and QA cadence",
    mission: "把90天计划拆成月、周、日动作，并推动复盘。",
    systemPrompt:
      "你是一名企业增长执行教练。你的任务不是继续提出泛泛建议，而是把目标拆成可检查任务，并建立周复盘、问题记录和调整机制。",
  },
];

function lowestCapabilities(scores: Record<string, number>, count = 3) {
  const entries = Object.entries(scores);
  if (!entries.length) return ["战略定位", "获客系统", "成交转化"];
  return entries.sort((first, second) => first[1] - second[1]).slice(0, count).map(([name]) => name);
}

function companyLabel(input: AIReportInput) {
  return input.company_info?.company || input.company_info?.company_name || "该企业";
}

function industryLabel(input: AIReportInput) {
  return input.company_info?.industry || "当前行业";
}

function buildInsight(agent: GrowthCouncilAgent, input: AIReportInput, bottlenecks: string[]): GrowthCouncilInsight {
  const company = companyLabel(input);
  const industry = industryLabel(input);
  const [first, second, third] = bottlenecks;
  const level = input.growth_level || "待诊断阶段";

  const map: Record<
    GrowthCouncilAgentId,
    Omit<
      GrowthCouncilInsight,
      "agentId" | "agentName" | "role" | "source" | "dbskillEntrypoints" | "gstackEntrypoints" | "integrationNote"
    >
  > = {
    strategy: {
      diagnosis: `${company}当前处于${level}，最需要先处理的是${first}，否则后续获客、成交和交付动作会继续分散。`,
      priority: `先把${first}定义成90天主战场。`,
      recommendations: [
        `用一页纸明确目标客户、核心场景、主推产品和衡量指标。`,
        `把${first}拆成1个北极星指标和3个每周可检查指标。`,
        `暂停低优先级增长动作，集中资源验证最关键假设。`,
      ],
      nextActions: ["召开一次增长诊断会", "确定90天唯一主目标", "建立每周复盘表"],
    },
    marketing: {
      diagnosis: `${industry}企业的获客动作需要从零散投放升级为内容、渠道和私域承接闭环。当前${second}会影响线索稳定性。`,
      priority: `建立可复用获客实验，而不是一次性流量动作。`,
      recommendations: [
        `围绕高价值客户痛点设计3个内容主题。`,
        `选择1个主渠道和1个辅助渠道连续测试4周。`,
        `每条线索进入统一私域承接表，记录来源、需求和下一步动作。`,
      ],
      nextActions: ["整理10个客户痛点", "设计4周内容排期", "建立线索来源记录"],
    },
    sales: {
      diagnosis: `${company}需要检查从咨询到成交的关键损失点，尤其是客户信任、需求确认和方案表达是否标准化。`,
      priority: `先提升咨询到成交的转化确定性。`,
      recommendations: [
        `沉淀首次沟通问题清单，避免销售只介绍产品。`,
        `把客户异议分成价格、信任、需求、时机四类处理。`,
        `设计成交后复购和转介绍触发机制。`,
      ],
      nextActions: ["复盘最近20个未成交线索", "形成首次咨询SOP", "整理高频异议话术"],
    },
    product: {
      diagnosis: `${company}需要让产品价值更容易被客户理解，尤其要把交付结果、适用对象和边界说清楚。`,
      priority: `优化产品包装和价值表达。`,
      recommendations: [
        `将主推产品拆成基础版、增长版和陪跑版。`,
        `每个版本绑定明确结果、周期、交付物和价格逻辑。`,
        `用客户案例证明结果，而不是只描述功能。`,
      ],
      nextActions: ["重写主推产品说明", "补充3个案例证据", "梳理产品套餐"],
    },
    operations: {
      diagnosis: `${third}说明企业增长动作还没有充分流程化，容易依赖个人经验和临时推动。`,
      priority: `把有效动作沉淀为团队可执行SOP。`,
      recommendations: [
        `为获客、跟进、成交、交付分别指定责任人。`,
        `把关键动作变成清单和模板，降低执行波动。`,
        `建立周会节奏，只讨论指标、问题、动作和负责人。`,
      ],
      nextActions: ["建立增长任务看板", "明确责任人", "固定每周复盘时间"],
    },
    finance: {
      diagnosis: `${company}的增长计划需要同步验证获客成本、成交率、客单价和交付毛利，避免只追求线索数量。`,
      priority: `先确认增长动作的ROI模型。`,
      recommendations: [
        `记录每个渠道的线索成本和成交收入。`,
        `计算核心产品的毛利和交付人力占用。`,
        `优先放大高毛利、高复购、高转介绍的客户类型。`,
      ],
      nextActions: ["补齐渠道成本表", "计算主产品毛利", "标记高价值客户画像"],
    },
    coach: {
      diagnosis: `${company}已经有诊断结果，下一步关键不是继续分析，而是把90天计划变成每周可检查的执行节奏。`,
      priority: `建立目标、任务、反馈、复盘的闭环。`,
      recommendations: [
        `每周只保留3个最重要增长任务。`,
        `每个任务必须有负责人、截止时间和完成证据。`,
        `每周复盘时记录有效动作、无效动作和下周调整。`,
      ],
      nextActions: ["拆出本周3个任务", "设置完成证据", "安排周复盘"],
    },
  };

  return {
    agentId: agent.id,
    agentName: agent.name,
    role: agent.role,
    source: agent.source,
    dbskillEntrypoints: getAgentSkillMapping(agent.id)?.dbskillEntrypoints ?? [],
    gstackEntrypoints: getAgentSkillMapping(agent.id)?.gstackEntrypoints ?? [],
    integrationNote: getAgentSkillMapping(agent.id)?.integrationNote ?? "",
    ...map[agent.id],
  };
}

export function generateGrowthCouncilReport(input: AIReportInput): GrowthCouncilReport {
  const bottlenecks = (input.bottlenecks?.length ? input.bottlenecks : lowestCapabilities(input.scores)).slice(0, 3);
  const [first = "战略定位", second = "获客系统", third = "成交转化"] = bottlenecks;
  const agents = growthCouncilAgents.map((agent) => buildInsight(agent, input, [first, second, third]));

  return {
    councilName: "GrowthOS AI增长委员会",
    summary: `AI增长委员会判断：当前最应该围绕${first}建立90天增长主线，同时用${second}和${third}作为执行验证重点。`,
    agents,
    ninetyDayPlan: {
      objective: `用90天建立围绕${first}的增长闭环，并完成获客、成交、复盘三类关键动作。`,
      days0To30: [
        `完成${first}根因拆解，明确唯一增长主目标。`,
        `梳理客户、渠道、成交和交付数据，找出最关键断点。`,
        `建立AI增长委员会周复盘模板。`,
      ],
      days31To60: [
        `围绕${second}连续执行2轮增长实验。`,
        `沉淀内容、线索承接和销售沟通模板。`,
        `开始追踪线索量、咨询量、成交率和ROI。`,
      ],
      days61To90: [
        `把验证有效的动作固化为团队SOP。`,
        `评估${third}改善效果，决定下一轮放大或修正方向。`,
        `形成下一季度增长目标和资源配置建议。`,
      ],
    },
    gstackPipeline: gstackOperatingPipeline,
    operatingCadence: [
      "每日：记录新增线索、关键沟通和阻塞问题。",
      "每周：AI增长委员会复盘指标、问题、动作和责任人。",
      "每月：重新判断增长瓶颈是否转移，并调整90天计划。",
    ],
  };
}
