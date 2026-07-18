"use client";

import { useMemo, useState } from "react";
import Nav from "@/components/Nav";
import { growthCouncilAgents, type GrowthCouncilReport } from "@/lib/ai/growth-council";
import "./growth-council.css";

type StoredResult = {
  company?: string;
  industry?: string;
  employees?: string;
  index?: number;
  level?: string;
  answers?: Record<number, number>;
  engines?: Record<string, number>;
  scores?: Record<string, number>;
  strengths?: string[];
  bottlenecks?: string[];
};

function readStoredResult(): StoredResult | null {
  if (typeof window === "undefined") return null;
  const keys = ["growthos-result", "growthos_report", "growthos-progress"];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (!raw) continue;
      const value = JSON.parse(raw) as StoredResult & { info?: StoredResult; enterprise?: Record<string, unknown> };
      if (typeof value.index === "number" || value.engines || value.scores) return value;
      if (value.info || value.enterprise) {
        return {
          company: value.info?.company || String(value.enterprise?.companyName || ""),
          industry: value.info?.industry || String(value.enterprise?.industry || ""),
          employees: value.info?.employees || String(value.enterprise?.employeeCount || ""),
          answers: value.answers,
          index: value.index,
          level: value.level,
          engines: value.engines || value.scores,
          strengths: value.strengths,
          bottlenecks: value.bottlenecks,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

function getGrowthLevel(index: number) {
  if (index >= 90) return "增长领先型";
  if (index >= 70) return "高速增长型";
  if (index >= 40) return "增长突破型";
  return "增长探索型";
}

export default function GrowthCouncilPage() {
  const [report, setReport] = useState<GrowthCouncilReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const storedResult = useMemo(readStoredResult, []);
  const scores = storedResult?.engines || storedResult?.scores || {};
  const index = Math.max(0, Math.min(100, Math.round(storedResult?.index ?? 0)));
  const canGenerate = Boolean(storedResult && Object.keys(scores).length);

  async function generateCouncil() {
    if (!storedResult || !canGenerate || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai/growth-council", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_info: {
            company: storedResult.company,
            industry: storedResult.industry,
            employees: storedResult.employees,
          },
          answers: storedResult.answers,
          scores,
          growth_index: index,
          growth_level: storedResult.level || getGrowthLevel(index),
          strengths: storedResult.strengths,
          bottlenecks: storedResult.bottlenecks,
        }),
      });
      const data = await response.json() as { report?: GrowthCouncilReport; error?: string };
      if (!response.ok || !data.report) throw new Error(data.error || "AI委员会暂时无法生成分析");
      setReport(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI委员会暂时无法生成分析");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Nav ctaLabel="开始诊断" />
      <main className="council-page">
        <section className="council-hero">
          <div className="container council-hero-inner">
            <div>
              <span className="eyebrow">GrowthOS 2.0</span>
              <h1>AI增长委员会</h1>
              <p>
                基于你的企业诊断结果，7位AI增长顾问会分别从战略、获客、成交、产品、运营、财务和执行角度给出分析，并生成90天增长行动计划。
              </p>
              <div className="council-actions">
                {canGenerate ? (
                  <button className="btn" type="button" onClick={generateCouncil} disabled={loading}>
                    {loading ? "AI委员会分析中..." : report ? "重新生成分析" : "生成AI委员会分析"}
                  </button>
                ) : (
                  <a className="btn" href="/assessment/company">先完成企业诊断</a>
                )}
                <a className="btn secondary" href="/report">查看增长报告</a>
              </div>
              {error ? <p className="council-error">{error}</p> : null}
            </div>
            <div className="council-panel" aria-label="当前诊断数据">
              <div className="council-step">
                <strong>{canGenerate ? String(index) : "--"}</strong>
                <span>{canGenerate ? "当前增长指数" : "暂无诊断数据"}</span>
              </div>
              <div className="council-step">
                <strong>01</strong>
                <span>{storedResult?.company || "企业名称待读取"}</span>
              </div>
              <div className="council-step">
                <strong>02</strong>
                <span>{storedResult?.industry || "行业信息待读取"}</span>
              </div>
              <div className="council-step">
                <strong>03</strong>
                <span>{canGenerate ? "已准备生成委员会分析" : "完成诊断后可使用"}</span>
              </div>
            </div>
          </div>
        </section>

        {report ? (
          <>
            <section className="section">
              <div className="container">
                <div className="section-heading">
                  <span className="eyebrow">AI委员会结论</span>
                  <h2>{report.councilName}</h2>
                  <p className="muted">{report.summary}</p>
                </div>
                <div className="council-result-grid">
                  {report.agents.map((agent) => (
                    <article className="council-result-card" key={agent.agentId}>
                      <span>{agent.role}</span>
                      <h3>{agent.agentName}</h3>
                      <p><strong>诊断：</strong>{agent.diagnosis}</p>
                      <p><strong>优先级：</strong>{agent.priority}</p>
                      <div>
                        <strong>建议动作</strong>
                        {agent.recommendations.map((item, index) => <p key={`${agent.agentId}-rec-${index}`}>✓ {item}</p>)}
                      </div>
                      <div>
                        <strong>下一步</strong>
                        {agent.nextActions.map((item, index) => <p key={`${agent.agentId}-next-${index}`}>{index + 1}. {item}</p>)}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="section council-band">
              <div className="container">
                <div className="section-heading">
                  <span className="eyebrow">90天增长计划</span>
                  <h2>{report.ninetyDayPlan.objective}</h2>
                </div>
                <div className="council-plan-grid">
                  <article>
                    <span>第一阶段｜0-30天</span>
                    <h3>基础修复</h3>
                    {report.ninetyDayPlan.days0To30.map((item, index) => <p key={`p1-${index}`}>✓ {item}</p>)}
                  </article>
                  <article>
                    <span>第二阶段｜31-60天</span>
                    <h3>能力提升</h3>
                    {report.ninetyDayPlan.days31To60.map((item, index) => <p key={`p2-${index}`}>✓ {item}</p>)}
                  </article>
                  <article>
                    <span>第三阶段｜61-90天</span>
                    <h3>系统建设</h3>
                    {report.ninetyDayPlan.days61To90.map((item, index) => <p key={`p3-${index}`}>✓ {item}</p>)}
                  </article>
                </div>
              </div>
            </section>
          </>
        ) : (
          <section className="section">
            <div className="container">
              <div className="section-heading">
                <span className="eyebrow">7位AI顾问</span>
                <h2>完成诊断后即可生成委员会分析</h2>
                <p className="muted">
                  每位顾问负责一个关键增长视角：先诊断，再给优先级，最后拆成可执行动作。
                </p>
              </div>
              <div className="council-grid">
                {growthCouncilAgents.map((agent) => (
                  <article className="council-card" key={agent.id}>
                    <span>{agent.role}</span>
                    <h3>{agent.name}</h3>
                    <p>{agent.mission}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
