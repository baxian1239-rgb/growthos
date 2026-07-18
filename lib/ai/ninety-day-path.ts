import type { NinetyDayGrowthPath } from "./report-generator";

type PathLike = Record<string, unknown>;

const DEFAULT_PATH: NinetyDayGrowthPath = {
  days0To30: [
    "明确90天唯一增长目标，锁定当前最关键的增长瓶颈。",
    "梳理客户来源、咨询转化、成交和交付数据，找出优先修复断点。",
    "建立每周增长复盘节奏，记录指标、问题、动作和负责人。",
  ],
  days30To60: [
    "围绕核心瓶颈执行两轮增长实验，验证获客、成交或产品优化动作。",
    "沉淀有效动作的内容模板、销售话术和客户跟进SOP。",
    "开始追踪线索量、咨询量、成交率、客单价和ROI变化。",
  ],
  days60To90: [
    "把验证有效的增长动作固化为团队SOP和任务看板。",
    "复盘90天结果，判断瓶颈是否转移，并确定下一季度增长重点。",
    "形成可复制的增长节奏，让企业从一次性诊断进入持续优化。",
  ],
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function actionList(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(actionList).filter(Boolean);
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (value && typeof value === "object") {
    const item = value as PathLike;
    const direct = item.action ?? item.actions ?? item.task ?? item.tasks ?? item.content ?? item.description ?? item.recommendation ?? item.title;
    return actionList(direct);
  }
  return [];
}

function pathObject(value: unknown): PathLike {
  return value && typeof value === "object" && !Array.isArray(value) ? value as PathLike : {};
}

function phaseActions(source: PathLike, keys: string[], fallback: string[]) {
  for (const key of keys) {
    const actions = actionList(source[key]);
    if (actions.length) return actions;
  }
  return fallback;
}

export function normalizeNinetyDayPath(value: unknown, fallback: NinetyDayGrowthPath = DEFAULT_PATH): NinetyDayGrowthPath {
  const source = pathObject(value);
  const nested = pathObject(source.ninetyDayPath ?? source.ninetyDayPlan ?? source.actionPlan);
  const path = Object.keys(nested).length ? nested : source;

  return {
    days0To30: phaseActions(path, ["days0To30", "days0to30", "days1_30", "days1To30", "0-30", "1-30"], fallback.days0To30),
    days30To60: phaseActions(path, ["days30To60", "days31To60", "days31_60", "30-60", "31-60"], fallback.days30To60),
    days60To90: phaseActions(path, ["days60To90", "days61To90", "days61_90", "60-90", "61-90"], fallback.days60To90),
  };
}
