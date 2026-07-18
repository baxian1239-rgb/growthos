"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { GeneratedGrowthReport } from "@/lib/ai/report-generator";
import "./lead.css";

type LeadInfo = {
  company_name: string;
  industry: string;
  company_size: string;
  contact_name: string;
  phone: string;
  wechat: string;
};

type ReportSnapshot = {
  index?: number;
  company?: string;
  industry?: string;
  employees?: string;
  answers?: Record<number, number>;
  engines?: Record<string, number>;
  strengths?: string[];
  bottlenecks?: string[];
};

const initialLead: LeadInfo = {
  company_name: "",
  industry: "",
  company_size: "",
  contact_name: "",
  phone: "",
  wechat: "",
};

function getGrowthLevel(score: number) {
  if (score >= 90) return "增长领先型";
  if (score >= 70) return "高速成长型";
  if (score >= 40) return "增长突破型";
  return "增长探索型";
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function ensureAIReport(signal: AbortSignal) {
  const existingReport = readJson<GeneratedGrowthReport>("growthos-ai-report");
  if (existingReport) return existingReport;

  const result = readJson<ReportSnapshot>("growthos-result");
  if (!result?.engines || typeof result.index !== "number") return null;

  const response = await fetch("/api/ai/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      company_info: {
        company: result.company,
        industry: result.industry,
        employees: result.employees,
      },
      answers: result.answers,
      scores: result.engines,
      growth_index: result.index,
      growth_level: getGrowthLevel(result.index),
      strengths: result.strengths,
      bottlenecks: result.bottlenecks,
    }),
  });

  if (!response.ok) throw new Error("AI report generation failed");
  const data = await response.json() as { report?: GeneratedGrowthReport };
  if (data.report) {
    localStorage.setItem("growthos-ai-report", JSON.stringify(data.report));
    sessionStorage.setItem("growthos-ai-report", JSON.stringify(data.report));
    return data.report;
  }
  return null;
}

export default function LeadPage() {
  const [lead, setLead] = useState<LeadInfo>(initialLead);
  const [totalScore, setTotalScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [generationStep, setGenerationStep] = useState(2);
  const [reportReady, setReportReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submittedLeadId, setSubmittedLeadId] = useState("");

  useEffect(() => {
    const companyInfo = readJson<Partial<LeadInfo>>("growthos-company-info");
    const progress = readJson<{
      info?: {
        company?: string;
        industry?: string;
        employees?: string;
        name?: string;
        phone?: string;
      };
    }>("growthos-progress");
    const report = readJson<ReportSnapshot>("growthos-result");
    const aiReport = readJson<GeneratedGrowthReport>("growthos-ai-report");

    setLead({
      company_name: companyInfo?.company_name || progress?.info?.company || "",
      industry: companyInfo?.industry || progress?.info?.industry || "",
      company_size: companyInfo?.company_size || progress?.info?.employees || "",
      contact_name: companyInfo?.contact_name || progress?.info?.name || "",
      phone: companyInfo?.phone || progress?.info?.phone || "",
      wechat: companyInfo?.wechat || "",
    });
    setTotalScore(Math.max(0, Math.min(100, Math.round(report?.index ?? 0))));
  }, []);

  useEffect(() => {
    if (!submitted) return;

    let active = true;
    let minimumElapsed = false;
    let generationFinished = false;
    const controller = new AbortController();
    setGenerationStep(2);
    setReportReady(false);
    const finishWhenReady = () => {
      if (!active || !minimumElapsed || !generationFinished) return;
      setGenerationStep(4);
      setReportReady(true);
    };
    const pathTimer = window.setTimeout(() => setGenerationStep(3), 3500);
    const minimumTimer = window.setTimeout(() => {
      minimumElapsed = true;
      finishWhenReady();
    }, 6000);
    const maximumTimer = window.setTimeout(() => {
      generationFinished = true;
      controller.abort();
      finishWhenReady();
    }, 10000);

    ensureAIReport(controller.signal)
      .catch(() => undefined)
      .finally(() => {
        generationFinished = true;
        window.clearTimeout(maximumTimer);
        finishWhenReady();
      });

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(pathTimer);
      window.clearTimeout(minimumTimer);
      window.clearTimeout(maximumTimer);
    };
  }, [submitted]);

  function update(field: keyof LeadInfo, value: string) {
    setLead((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const controller = new AbortController();
    const aiReport = await ensureAIReport(controller.signal).catch(() => readJson<GeneratedGrowthReport>("growthos-ai-report"));
    const aiReportSnapshot = aiReport ? {
      currentGrowthState: aiReport.currentGrowthState,
      topBottlenecks: aiReport.topBottlenecks,
      ninetyDayPath: aiReport.ninetyDayPath,
      aiGrowthAdvice: aiReport.aiGrowthAdvice,
    } : null;

    const payload = {
      company_name: lead.company_name.trim(),
      industry: lead.industry.trim(),
      company_size: lead.company_size.trim(),
      contact_name: lead.contact_name.trim(),
      phone: lead.phone.trim(),
      wechat: lead.wechat.trim(),
      total_score: totalScore,
      growth_level: getGrowthLevel(totalScore),
      created_at: new Date().toISOString(),
      ai_report: aiReportSnapshot,
      lead_status: "new",
      sales_note: "",
    };

    localStorage.setItem("growthos-report-lead", JSON.stringify(payload));

    if (!supabase) {
      setSaving(false);
      setError("Supabase 尚未配置，请检查 .env.local。");
      return;
    }

    let { data: insertedLead, error } = await supabase.from("growth_leads").insert(payload).select("id").maybeSingle();
    if (error?.message.includes("ai_report") || error?.message.includes("lead_status") || error?.message.includes("sales_note")) {
      const { ai_report: _aiReport, lead_status: _leadStatus, sales_note: _salesNote, ...legacyPayload } = payload;
      ({ data: insertedLead, error } = await supabase.from("growth_leads").insert(legacyPayload).select("id").maybeSingle());
    }
    setSaving(false);

    if (error) {
      setError(`提交失败：${error.message}`);
      return;
    }

    if (insertedLead?.id) {
      const leadId = String(insertedLead.id);
      localStorage.setItem("lead_id", leadId);
      sessionStorage.setItem("lead_id", leadId);
      setSubmittedLeadId(leadId);
    }

    setSubmitted(true);
  }

  if (submitted) {
    const analysisSteps = [
      "识别企业当前增长阶段",
      "分析28项经营能力",
      "定位核心增长瓶颈",
      "制定90天增长路径",
    ];

    return (
      <main className="container section">
        <div className="card report-empty lead-success">
          {reportReady ? (
            <>
              <span className="eyebrow lead-success-badge">✓ 报告已生成</span>
              <h1>您的专属增长报告已生成</h1>
              <div className="lead-success-value">
                <div className="lead-success-list">
                  <span>✓ 企业增长指数</span>
                  <span>✓ 核心增长瓶颈</span>
                  <span>✓ 90天行动计划</span>
                  <span>✓ AI增长建议</span>
                </div>
              </div>
              <a className="btn" href={submittedLeadId ? `/report?lead_id=${submittedLeadId}` : "/report"}>
                查看我的专属报告
              </a>
            </>
          ) : (
            <>
              <span className="eyebrow lead-generating-badge">AI顾问分析中</span>
              <h1>AI正在生成您的企业增长方案</h1>
              <p className="muted lead-success-description">基于您的企业信息、28项能力评测和增长数据，AI顾问正在分析您的增长机会。</p>
              <div className="lead-generation-status" role="status" aria-live="polite">
                <span className="lead-loader" aria-hidden="true" />
                <strong>正在生成您的专属增长报告</strong>
              </div>
              <div className="lead-analysis-steps" aria-label="报告分析进度">
                {analysisSteps.map((step, index) => {
                  const status = index < generationStep ? "completed" : index === generationStep ? "current" : "pending";
                  return (
                    <div className={`lead-analysis-step ${status}`} key={step}>
                      <span className="lead-step-icon" aria-hidden="true">
                        {status === "completed" ? "✓" : status === "current" ? <span className="lead-step-loader">⏳</span> : "○"}
                      </span>
                      <span>{step}</span>
                    </div>
                  );
                })}
              </div>
              <p className="lead-generation-estimate">预计10秒完成</p>
            </>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="container section">
      <div className="form-shell lead-form-shell">
        <div className="section-heading lead-form-heading">
          <span className="eyebrow">AI专属增长方案</span>
          <h1>领取您的90天企业增长方案</h1>
          <p className="muted">AI增长顾问将基于您的企业诊断结果，为您生成专属增长建议。</p>
        </div>

        <section className="card lead-value-card">
          <h2>您将获得：</h2>
          <div className="lead-value-list">
            <span>✓ 核心增长瓶颈分析</span>
            <span>✓ 企业7大能力评分</span>
            <span>✓ 90天增长行动路线</span>
            <span>✓ AI增长顾问建议</span>
            <span>✓ 企业专属优化方案</span>
          </div>
        </section>

        <form className="card form-card" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="contact_name">姓名</label>
              <input
                id="contact_name"
                value={lead.contact_name}
                onChange={(event) => update("contact_name", event.target.value)}
                placeholder="请输入姓名"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="phone">手机号</label>
              <input
                id="phone"
                type="tel"
                value={lead.phone}
                onChange={(event) => update("phone", event.target.value)}
                placeholder="请输入手机号"
                required
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="wechat">微信号</label>
              <input
                id="wechat"
                value={lead.wechat}
                onChange={(event) => update("wechat", event.target.value)}
                placeholder="请输入微信号"
              />
            </div>
            <div className="field">
              <label htmlFor="company_name">企业名称</label>
              <input
                id="company_name"
                value={lead.company_name}
                onChange={(event) => update("company_name", event.target.value)}
                placeholder="请输入企业名称"
                required
              />
            </div>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="lead-submit-area">
            <button className="btn lead-submit-button" type="submit" disabled={saving}>
              {saving ? "正在提交..." : "免费领取我的90天增长方案"}
            </button>
            <p className="lead-trust-note">提交后，AI增长顾问将根据您的企业诊断结果生成专属方案。</p>
            <a className="lead-back-link" href="/report">返回查看报告</a>
          </div>
        </form>
      </div>
    </main>
  );
}
