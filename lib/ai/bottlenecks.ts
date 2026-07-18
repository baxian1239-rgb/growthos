import type { GrowthBottleneck } from "./report-generator";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const direct = text(value);
    if (direct) return direct;
    if (Array.isArray(value)) {
      const fromArray = value.map(text).find(Boolean);
      if (fromArray) return fromArray;
    }
  }
  return "";
}

function defaultBottleneck(name: string): GrowthBottleneck {
  return {
    name,
    problem: `${name}当前还没有形成稳定、可复用的增长方法，容易导致执行依赖个人经验。`,
    impact: "该问题会影响线索质量、成交效率或客户复购，降低企业增长的确定性。",
    suggestion: `建议围绕${name}设置明确目标、负责人和每周复盘机制，并沉淀为团队可执行的SOP。`,
  };
}

export function normalizeBottlenecks(value: unknown, fallbackNames: string[] = []): GrowthBottleneck[] {
  const rawItems = Array.isArray(value) ? value : [];
  const normalized = rawItems.flatMap((entry): GrowthBottleneck[] => {
    if (typeof entry === "string") return [defaultBottleneck(entry)];
    if (!entry || typeof entry !== "object") return [];

    const item = entry as Record<string, unknown>;
    const name = firstText(item.name, item.title, item.capability, item.engine, item.problem) || "核心增长瓶颈";
    const fallback = defaultBottleneck(name);
    return [{
      name,
      problem: firstText(item.problem, item.description, item.issue, item.currentProblem, item.value) || fallback.problem,
      impact: firstText(item.impact, item.effect, item.risk, item.businessImpact) || fallback.impact,
      suggestion: firstText(item.suggestion, item.advice, item.recommendation, item.solution, item.action, item.nextStep, item.optimization) || fallback.suggestion,
    }];
  });

  if (normalized.length) return normalized;
  return fallbackNames.slice(0, 3).map(defaultBottleneck);
}
