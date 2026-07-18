"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeBottlenecks } from "@/lib/ai/bottlenecks";
import { generateMockGrowthReport, type GeneratedGrowthReport } from "@/lib/ai/report-generator";
import { normalizeNinetyDayPath } from "@/lib/ai/ninety-day-path";
import { recommendGrowthServices } from "@/lib/ai/service-recommendations";
import { calculate } from "@/lib/scoring";
import { supabase } from "@/lib/supabase";
import "./report.css";

type ReportData = {
  company?: string;
  industry?: string;
  employees?: string;
  answers?: Record<number, number>;
  index?: number;
  engines?: Record<string, number>;
  strengths?: string[];
  bottlenecks?: string[];
  advice?: string[];
};

type AdviceItem = {
  title?: string;
  content: string;
};

function getGrowthLevel(index: number) {
  if (index >= 90) return "增长领先型";
  if (index >= 70) return "高速成长型";
  if (index >= 40) return "增长突破型";
  return "增长探索型";
}

function readStorage<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

function normalizeReport(value: unknown): ReportData | null {
  if (!value || typeof value !== "object") return null;

  const source = value as Record<string, unknown>;
  const enterprise = source.enterprise && typeof source.enterprise === "object"
    ? source.enterprise as Record<string, unknown>
    : {};
  const info = source.info && typeof source.info === "object"
    ? source.info as Record<string, unknown>
    : {};
  const answers = source.answers && typeof source.answers === "object"
    ? source.answers as Record<number, number>
    : {};
  const calculated = Object.keys(answers).length ? calculate(answers) : null;
  const rawIndex = source.index ?? source.totalScore ?? source.score ?? calculated?.index;
  const index = Number(rawIndex);
  const rawEngines = source.engines ?? source.engine_scores ?? source.scores ?? calculated?.engines;
  const engines = rawEngines && typeof rawEngines === "object" && !Array.isArray(rawEngines)
    ? rawEngines as Record<string, number>
    : {};
  const hasResult = Number.isFinite(index) || Object.keys(answers).length > 0 || Object.keys(engines).length > 0;

  if (!hasResult) return null;

  return {
    company: String(source.company ?? source.company_name ?? info.company ?? enterprise.companyName ?? ""),
    industry: String(source.industry ?? info.industry ?? enterprise.industry ?? ""),
    employees: String(source.employees ?? source.company_size ?? info.employees ?? enterprise.employeeCount ?? ""),
    answers,
    index: Number.isFinite(index) ? index : calculated?.index ?? 0,
    engines,
    strengths: Array.isArray(source.strengths) ? source.strengths.map(String) : calculated?.strengths ?? [],
    bottlenecks: Array.isArray(source.bottlenecks) ? source.bottlenecks.map(String) : calculated?.bottlenecks ?? [],
    advice: Array.isArray(source.advice) ? source.advice.map(String) : calculated?.advice ?? [],
  };
}

export default function Report() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [serverReport, setServerReport] = useState<GeneratedGrowthReport | null>(null);
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "ready" | "fallback">("idle");
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restoreReport() {
      const params = new URLSearchParams(window.location.search);
      const assessmentId = params.get("assessment_id") || localStorage.getItem("assessment_id") || sessionStorage.getItem("assessment_id");
      const leadId = params.get("lead_id") || localStorage.getItem("lead_id") || sessionStorage.getItem("lead_id");
      let restoredReport: ReportData | null = null;
      let restoredAIReport: GeneratedGrowthReport | null = null;

      if (supabase && assessmentId) {
        const assessmentResult = await supabase.from("assessment_records").select("*").eq("id", assessmentId).maybeSingle();
        if (assessmentResult.data) restoredReport = normalizeReport(assessmentResult.data);
      }

      if (supabase && !restoredReport && leadId) {
        const leadResult = await supabase.from("growth_leads").select("company_name,industry,company_size,total_score,ai_report").eq("id", leadId).maybeSingle();
        if (leadResult.data) {
          restoredReport = normalizeReport(leadResult.data);
          if (leadResult.data.ai_report && typeof leadResult.data.ai_report === "object") {
            restoredAIReport = leadResult.data.ai_report as GeneratedGrowthReport;
          }
        }
      }

      const storages = [localStorage, sessionStorage];
      if (!restoredReport) {
        for (const storage of storages) {
          restoredReport = normalizeReport(readStorage<unknown>(storage, "growthos-result"))
            || normalizeReport(readStorage<unknown>(storage, "growthos_report"));
          if (restoredReport) break;
        }
      }

      if (!restoredReport) {
        for (const storage of storages) {
          restoredReport = normalizeReport(readStorage<unknown>(storage, "growthos-progress"));
          if (restoredReport) break;
        }
      }

      if (!restoredAIReport) {
        for (const storage of storages) {
          const cachedAIReport = readStorage<GeneratedGrowthReport>(storage, "growthos-ai-report");
          if (cachedAIReport) {
            restoredAIReport = cachedAIReport;
            break;
          }
        }
      }

      if (!restoredReport && restoredAIReport) {
        const companyInfo = readStorage<Record<string, unknown>>(localStorage, "growthos-company-info") ?? {};
        restoredReport = normalizeReport({
          company_name: companyInfo.company_name,
          industry: companyInfo.industry,
          company_size: companyInfo.company_size,
          index: restoredAIReport.growthIndexAnalysis?.growth_index,
        });
      }

      if (restoredReport) {
        const serialized = JSON.stringify(restoredReport);
        localStorage.setItem("growthos-result", serialized);
        sessionStorage.setItem("growthos-result", serialized);
      }
      if (restoredAIReport) {
        const serializedAIReport = JSON.stringify(restoredAIReport);
        localStorage.setItem("growthos-ai-report", serializedAIReport);
        sessionStorage.setItem("growthos-ai-report", serializedAIReport);
      }

      if (!cancelled) {
        setReport(restoredReport);
        setServerReport(restoredAIReport);
        if (restoredAIReport) setAiStatus("ready");
        setRestoring(false);
      }
    }

    void restoreReport().catch(() => {
      if (!cancelled) {
        setReport(null);
        setRestoring(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const index = Math.max(0, Math.min(100, Math.round(report?.index ?? 0)));
  const level = getGrowthLevel(index);
  const engines = report?.engines ?? {};
  const strengths = report?.strengths ?? [];
  const bottlenecks = report?.bottlenecks ?? [];
  const aiInput = useMemo(
    () => ({
        company_info: {
          company: report?.company,
          industry: report?.industry,
          employees: report?.employees,
        },
        answers: report?.answers,
        scores: engines,
        growth_level: level,
        growth_index: index,
        strengths,
        bottlenecks,
      }),
    [report, engines, level, index, strengths, bottlenecks]
  );
  const fallbackReport = useMemo(() => generateMockGrowthReport(aiInput), [aiInput]);
  const aiReport = serverReport ?? fallbackReport;
  const reportData = aiReport as GeneratedGrowthReport & Record<string, unknown>;
  const displayValue = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) return value.map(displayValue).filter(Boolean).join("、");
    if (typeof value === "object") return Object.entries(value as Record<string, unknown>).map(([key, item]) => `${key}：${displayValue(item)}`).join("；");
    return String(value);
  };
  const toList = <T,>(value: unknown, convert: (value: unknown, key: string) => T): T[] => {
    if (Array.isArray(value)) return value.map((item, index) => convert(item, String(index)));
    if (value && typeof value === "object") return Object.entries(value).map(([key, item]) => convert(item, key));
    return [];
  };
  const toTextList = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.map(displayValue).filter(Boolean);
    if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).map(displayValue).filter(Boolean);
    const text = displayValue(value);
    return text ? [text] : [];
  };
  const capabilityAnalysis = toList(reportData.capabilityAnalysis, (value, key) => {
    const item = value && typeof value === "object" ? value as Record<string, unknown> : { score: value };
    return { name: displayValue(item.name ?? key), score: Number(item.score ?? item.value ?? 0), interpretation: displayValue(item.interpretation ?? item.description ?? ""), strengths: item.strengths, bottlenecks: item.bottlenecks };
  });
  const priorityCapabilities = [...capabilityAnalysis]
    .sort((first, second) => first.score - second.score)
    .slice(0, 3)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
      reason: toTextList(item.bottlenecks).join("；") || item.interpretation || `${item.name}当前得分相对靠后，优先提升可减少其对整体增长链路的限制。`,
    }));
  const topBottlenecks = normalizeBottlenecks(reportData.topBottlenecks ?? reportData.bottlenecks, bottlenecks);
  const parseAdvice = (value: unknown, key = ""): AdviceItem | null => {
    if (value === null || value === undefined) return null;
    if (typeof value !== "object" || Array.isArray(value)) {
      const content = displayValue(value);
      return content ? { content } : null;
    }

    const item = value as Record<string, unknown>;
    const title = displayValue(item.title ?? item.name ?? item.heading ?? "");
    const directContent = displayValue(item.content ?? item.description ?? item.text ?? item.advice ?? item.recommendation ?? "");
    const remainingContent = Object.entries(item)
      .filter(([itemKey]) => !["title", "name", "heading", "content", "description", "text", "advice", "recommendation"].includes(itemKey))
      .map(([, itemValue]) => displayValue(itemValue))
      .filter(Boolean)
      .join("；");
    const content = directContent || remainingContent;
    const fallbackTitle = key && !/^\d+$/.test(key) ? key : undefined;
    return content || title ? { title: title || fallbackTitle, content: content || title } : null;
  };
  const normalizeAdvice = (value: unknown): AdviceItem[] => {
    if (Array.isArray(value)) return value.map((item, index) => parseAdvice(item, String(index))).filter((item): item is AdviceItem => Boolean(item));
    if (value && typeof value === "object") {
      const item = value as Record<string, unknown>;
      if ("title" in item || "content" in item || "description" in item || "advice" in item) {
        const parsed = parseAdvice(item);
        return parsed ? [parsed] : [];
      }
      return Object.entries(item).map(([key, itemValue]) => parseAdvice(itemValue, key)).filter((entry): entry is AdviceItem => Boolean(entry));
    }
    const parsed = parseAdvice(value);
    return parsed ? [parsed] : [];
  };
  const advice = normalizeAdvice(reportData.aiGrowthAdvice ?? reportData.aiAdvice ?? reportData.recommendation ?? reportData.actionPlan);
  const normalizedPath = normalizeNinetyDayPath(reportData.ninetyDayPath ?? reportData.ninetyDayPlan ?? reportData.actionPlan);
  const days0To30 = normalizedPath.days0To30.map(displayValue);
  const days30To60 = normalizedPath.days30To60.map(displayValue);
  const days60To90 = normalizedPath.days60To90.map(displayValue);
  const growthPhases = [
    { label: "第一阶段｜0-30天", title: "基础修复期", actions: days0To30 },
    { label: "第二阶段｜30-60天", title: "能力提升期", actions: days30To60 },
    { label: "第三阶段｜60-90天", title: "系统建设期", actions: days60To90 },
  ];
  const currentStateValue = reportData.currentGrowthState;
  const currentState = currentStateValue && typeof currentStateValue === "object" && !Array.isArray(currentStateValue)
    ? currentStateValue as Record<string, unknown>
    : {};
  const currentStage = displayValue(currentState.stage ?? currentState.growthStage ?? currentState.growth_level ?? aiReport.growthIndexAnalysis?.growth_level);
  const currentStrengths = toTextList(currentState.strengths ?? currentState.advantages ?? strengths);
  const currentWeaknesses = toTextList(currentState.weaknesses ?? currentState.bottlenecks ?? currentState.challenges ?? bottlenecks);
  const currentSummary = displayValue(
    currentState.summary ?? currentState.judgement ?? currentState.diagnosis ?? (typeof currentStateValue === "string" ? currentStateValue : "")
  );
  const serviceScores = Object.keys(engines).length
    ? engines
    : Object.fromEntries(capabilityAnalysis.map((item) => [item.name, item.score]));
  const serviceRecommendations = recommendGrowthServices({
    growthIndex: index,
    growthLevel: currentStage || level,
    scores: serviceScores,
    bottlenecks: Array.from(new Set([
      ...bottlenecks,
      ...topBottlenecks.flatMap((item) => [item.name, item.problem]).filter(Boolean),
    ])),
    report: aiReport,
  });

  useEffect(() => {
    if (!report || serverReport) return;

    let ignore = false;
    setAiStatus("loading");

    fetch("/api/ai/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(aiInput),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await response.text());
        }
        return response.json() as Promise<{ report: GeneratedGrowthReport }>;
      })
      .then((data) => {
        if (ignore) return;
        setServerReport(data.report);
        const serializedReport = JSON.stringify(data.report);
        localStorage.setItem("growthos-ai-report", serializedReport);
        sessionStorage.setItem("growthos-ai-report", serializedReport);
        setAiStatus("ready");
      })
      .catch(() => {
        if (ignore) return;
        setServerReport(null);
        setAiStatus("fallback");
      });

    return () => {
      ignore = true;
    };
  }, [report, aiInput, serverReport]);

  if (restoring) {
    return (
      <main className="container section">
        <div className="card report-empty">
          <span className="eyebrow">正在读取诊断数据</span>
          <h1>正在加载您的增长报告</h1>
          <p className="muted">请稍候，系统正在恢复本次企业评测结果。</p>
        </div>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="container section">
        <div className="card report-empty">
          <h1>暂无诊断结果</h1>
          <p className="muted">请先完成企业10倍增长评测，再查看增长报告。</p>
          <a className="btn" href="/assessment/company">
            开始增长
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="container section">
      <div className="report-shell">
        <p className="muted">企业10倍增长评测报告</p>

        <section className="card report-hero">
          <div>
            <span className="eyebrow">1. 企业增长指数分析</span>
            <div className="score">{displayValue(aiReport.growthIndexAnalysis?.growth_index)}</div>
            <h1>{displayValue(aiReport.growthIndexAnalysis?.growth_level)}</h1>
            <p className="muted">
              企业：{report.company || "未填写"}　行业：{report.industry || "未填写"}
            </p>
          </div>
          <div>
            <div className="index-scale" aria-label="增长指数等级">
              <span>0</span>
              <div className="scale-track">
                <div style={{ width: `${index}%` }} />
              </div>
              <span>100</span>
            </div>
            <p className="muted">{displayValue(aiReport.growthIndexAnalysis?.summary)}</p>
          </div>
        </section>

        <section className="card report-section">
          <span className="eyebrow">90天行动计划</span>
          <h2>您的90天增长行动计划</h2>
          <div className="growth-phase-grid">
            {growthPhases.map((phase) => (
              <article className="growth-phase-card" key={`action-${phase.label}`}>
                <span className="growth-phase-label">{phase.label}</span>
                <h3>{phase.title}</h3>
                <div className="growth-phase-actions">
                  {phase.actions.map((item, itemIndex) => (
                    <p key={`action-${item}-${itemIndex}`}>✓ {item}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="card report-section">
          <span className="eyebrow">
            2. 企业当前增长状态
            {aiStatus === "loading" ? " · AI生成中" : null}
            {aiStatus === "fallback" ? " · 模拟报告" : null}
            {aiStatus === "ready" ? " · AI已生成" : null}
          </span>
          <h2>当前增长状态诊断</h2>
          <div className="growth-state-report">
            <div className="growth-stage-line">
              <span>当前增长阶段</span>
              <strong>{currentStage || level}</strong>
            </div>
            <div className="growth-state-grid">
              <div className="growth-state-card strengths">
                <h3>核心优势</h3>
                {currentStrengths.length ? currentStrengths.map((item, itemIndex) => <p key={`${item}-${itemIndex}`}>✓ {item}</p>) : <p>✓ 企业已具备持续改善增长能力的基础。</p>}
              </div>
              <div className="growth-state-card weaknesses">
                <h3>核心瓶颈</h3>
                {currentWeaknesses.length ? currentWeaknesses.map((item, itemIndex) => <p key={`${item}-${itemIndex}`}>⚠ {item}</p>) : <p>⚠ 建议优先关注当前评分最低的增长能力。</p>}
              </div>
            </div>
            <div className="growth-summary">
              <h3>综合判断</h3>
              <p>{currentSummary || "企业需要围绕核心瓶颈建立明确目标、执行负责人和持续复盘机制。"}</p>
            </div>
          </div>
        </section>

        <section className="card report-section">
          <span className="eyebrow">3. 七大增长能力分析</span>
          <h2>能力评分与咨询解读</h2>
          {capabilityAnalysis.map((item) => (
            <div className="engine" key={item.name}>
              <strong>{item.name}</strong>
              <div className="bar">
                <div style={{ width: `${Math.min(100, (item.score / 16) * 100)}%` }} />
              </div>
              <span>{item.score}</span>
              <p className="muted">{item.interpretation}</p>
              {Array.isArray(item.strengths) && <p className="muted">优势：{item.strengths.map(displayValue).join("、")}</p>}
              {Array.isArray(item.bottlenecks) && <p className="muted">短板：{item.bottlenecks.map(displayValue).join("、")}</p>}
            </div>
          ))}
          <div className="priority-capabilities">
            <div className="priority-capabilities-heading">
              <span className="eyebrow">能力提升优先级</span>
              <h3>优先提升TOP3能力</h3>
            </div>
            <div className="priority-capability-list">
              {priorityCapabilities.map((item) => (
                <div className="priority-capability-row" key={item.name}>
                  <strong className="priority-rank">{item.rank}</strong>
                  <div><span className="priority-label">能力名称</span><strong>{item.name}</strong></div>
                  <div><span className="priority-label">当前分数</span><strong>{item.score}</strong></div>
                  <div><span className="priority-label">提升原因</span><p>{item.reason}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid report-grid">
          {topBottlenecks.map((item, index) => (
            <div className="card" key={item.name}>
              <h3>{index + 1}. {item.name}</h3>
              <p><strong>问题描述：</strong>{item.problem}</p>
              <p><strong>影响分析：</strong>{item.impact}</p>
              <p><strong>优化建议：</strong>{item.suggestion}</p>
            </div>
          ))}
        </section>

        <section className="card report-section">
          <span className="eyebrow">5. 未来90天增长路径</span>
          <h2>分阶段行动路径</h2>
          <div className="growth-phase-grid">
            {growthPhases.map((phase) => (
              <article className="growth-phase-card" key={phase.label}>
                <span className="growth-phase-label">{phase.label}</span>
                <h3>{phase.title}</h3>
                <div className="growth-phase-actions">
                  {phase.actions.map((item, index) => (
                    <p key={`${item}-${index}`}>✓ {item}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="card report-section">
          <span className="eyebrow">6. AI增长建议</span>
          <h2>AI增长建议</h2>
          {advice.map((item, index) => (
            <div className="advice-item" key={`${item.title || item.content}-${index}`}>
              {item.title ? <h3>{index + 1}. {item.title}</h3> : <p><strong>{index + 1}.</strong> {item.content}</p>}
              {item.title ? <p>{item.content}</p> : null}
            </div>
          ))}
        </section>

        <section className="card report-service-center">
          <div className="service-center-heading">
            <span className="eyebrow">企业增长咨询匹配</span>
            <h2>AI推荐增长方案</h2>
            <p className="muted">根据您的企业诊断结果，AI增长顾问为您匹配最适合的增长路径。</p>
          </div>
          <div className="service-recommendation-grid">
            {serviceRecommendations.map((service, serviceIndex) => (
              <article className={serviceIndex === 0 ? "recommended" : ""} key={service.id}>
                <div className="service-card-heading">
                  <span>{serviceIndex === 0 ? "首选方案" : `匹配方案 ${serviceIndex + 1}`}</span>
                  <h3>{service.name}</h3>
                  <p>适合：{service.suitableFor}</p>
                </div>
                <div className="service-ai-reason"><strong>AI推荐原因</strong><p>{service.reason}</p></div>
                <div className="service-signals"><strong>典型表现</strong>{service.signals.map((signal) => <span key={signal}>· {signal}</span>)}</div>
                <div className="service-solution"><strong>解决方向</strong><p>{service.solution}</p>{service.problems.map((problem) => <span key={problem}>✓ {problem}</span>)}</div>
              </article>
            ))}
          </div>
          <div className="service-center-cta">
            <div className="growth-cta-value">
              <h3>获取您的企业专属增长路径</h3>
              <p>AI增长顾问将结合本次企业诊断，为您制定专属90天增长方案与落地计划。</p>
              <div><span>✓ 分析核心增长瓶颈</span><span>✓ 制定90天增长路径</span><span>✓ 陪跑企业增长落地</span></div>
            </div>
            <div className="growth-cta-process" aria-label="增长咨询服务流程">
              <article><strong>1对1专家顾问</strong><p>资深增长顾问深度分析企业现状</p></article>
              <i>↓</i>
              <article><strong>定制解决方案</strong><p>根据诊断结果制定增长策略</p></article>
              <i>↓</i>
              <article><strong>90天陪跑落地</strong><p>从策略到执行持续优化</p></article>
            </div>
            <div className="growth-cta-action">
              <a className="btn" href="/lead">获取我的90天增长方案</a>
              <p>免费诊断 ✓ 专属方案 ✓ 无压力咨询</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
