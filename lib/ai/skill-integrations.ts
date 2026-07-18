import type { GrowthCouncilAgentId } from "./growth-council";

export type ExternalSkillIntegration = {
  project: "dbskill" | "gstack";
  repository: string;
  license: string;
  commercialUse: "allowed-with-notice" | "requires-separate-authorization";
  integrationMode: "embedded-workflow" | "external-adapter";
  notes: string;
};

export type AgentSkillMapping = {
  agentId: GrowthCouncilAgentId;
  dbskillEntrypoints: string[];
  gstackEntrypoints: string[];
  integrationNote: string;
};

export const externalSkillIntegrations: ExternalSkillIntegration[] = [
  {
    project: "dbskill",
    repository: "https://github.com/dontbesilent2025/dbskill",
    license: "CC BY-NC 4.0",
    commercialUse: "requires-separate-authorization",
    integrationMode: "external-adapter",
    notes:
      "Use as an external business-diagnosis adapter until commercial authorization is confirmed. Do not vendor its knowledge base or skill text into GrowthOS product code.",
  },
  {
    project: "gstack",
    repository: "https://github.com/garrytan/gstack",
    license: "MIT",
    commercialUse: "allowed-with-notice",
    integrationMode: "embedded-workflow",
    notes:
      "Use its sprint workflow ideas directly in GrowthOS: office hours, CEO review, engineering review, QA, review, ship, and retro.",
  },
];

export const agentSkillMappings: AgentSkillMapping[] = [
  {
    agentId: "strategy",
    dbskillEntrypoints: ["/dbs-diagnosis", "/dbs-benchmark", "/dbs-good-question"],
    gstackEntrypoints: ["/office-hours", "/plan-ceo-review"],
    integrationNote: "商业根因诊断 + CEO级方向挑战。",
  },
  {
    agentId: "marketing",
    dbskillEntrypoints: ["/dbs-content", "/dbs-hook", "/dbs-spread"],
    gstackEntrypoints: ["/office-hours", "/plan-ceo-review"],
    integrationNote: "内容获客判断 + 增长机会重构。",
  },
  {
    agentId: "sales",
    dbskillEntrypoints: ["/dbs-diagnosis", "/dbs-action", "/dbs-deconstruct"],
    gstackEntrypoints: ["/review", "/qa"],
    integrationNote: "成交卡点拆解 + 流程漏洞检查。",
  },
  {
    agentId: "product",
    dbskillEntrypoints: ["/dbs-diagnosis", "/dbs-benchmark"],
    gstackEntrypoints: ["/plan-ceo-review", "/plan-design-review", "/plan-eng-review"],
    integrationNote: "产品价值判断 + 可构建性评审。",
  },
  {
    agentId: "operations",
    dbskillEntrypoints: ["/dbs-action", "/dbs-decision", "/dbs-save"],
    gstackEntrypoints: ["/autoplan", "/review", "/document-release"],
    integrationNote: "行动推进 + 团队执行系统沉淀。",
  },
  {
    agentId: "finance",
    dbskillEntrypoints: ["/dbs-diagnosis", "/dbs-benchmark", "/dbs-decision"],
    gstackEntrypoints: ["/plan-eng-review", "/benchmark"],
    integrationNote: "商业模式判断 + 指标验证。",
  },
  {
    agentId: "coach",
    dbskillEntrypoints: ["/dbs-action", "/dbs-slowisfast", "/dbs-report"],
    gstackEntrypoints: ["/qa", "/ship", "/retro", "/learn"],
    integrationNote: "行动卡点推进 + 复盘、交付、记忆机制。",
  },
];

export const gstackOperatingPipeline = [
  {
    phase: "Think",
    skill: "/office-hours",
    output: "澄清真实痛点、客户场景和最小切入点。",
  },
  {
    phase: "Plan",
    skill: "/plan-ceo-review + /plan-eng-review",
    output: "挑战方向、锁定范围、补齐架构和风险。",
  },
  {
    phase: "Build",
    skill: "/autoplan",
    output: "把目标转成可执行任务和检查点。",
  },
  {
    phase: "Review",
    skill: "/review",
    output: "发现计划和实现中的漏洞、遗漏和复杂度问题。",
  },
  {
    phase: "Test",
    skill: "/qa",
    output: "用真实路径验证体验、数据和执行结果。",
  },
  {
    phase: "Ship",
    skill: "/ship",
    output: "形成可交付版本，并记录验证证据。",
  },
  {
    phase: "Reflect",
    skill: "/retro + /learn",
    output: "沉淀复盘、企业记忆和下一轮优化方向。",
  },
];

export function getAgentSkillMapping(agentId: GrowthCouncilAgentId) {
  return agentSkillMappings.find((mapping) => mapping.agentId === agentId);
}
