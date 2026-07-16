"use client";

import { useEffect, useState } from "react";
import type { GeneratedGrowthReport } from "@/lib/ai/report-generator";
import { recommendGrowthServices } from "@/lib/ai/service-recommendations";
import {
  LEAD_STATUSES,
  generateSalesAIAnalysis,
  getCoreProblems,
  getCustomerLevel,
  getCustomerLevelReason,
  getDealScore,
  getFollowUpRecommendation,
  getLeadStatusLabel,
  normalizeLeadStatus,
  type FirstWechatScript,
  type FollowUpRecord,
  type LeadStatus,
  type NextFollowUpAdvice,
  type SalesAIAnalysis,
  type SalesLeadInput,
} from "@/lib/ai/sales-assistant";
import { supabase } from "@/lib/supabase";
import "../../admin.css";

type Lead = SalesLeadInput & {
  id: string;
  contact_name: string;
  phone: string;
  wechat: string | null;
  created_at: string;
  sales_ai_analysis: SalesAIAnalysis | null;
  first_wechat_script: FirstWechatScript | null;
  follow_up_records: FollowUpRecord[];
  next_follow_up_advice: NextFollowUpAdvice | null;
  consult_status: string | null;
};

const baseFields = "id,company_name,industry,company_size,contact_name,phone,wechat,total_score,growth_level,lead_status,sales_note,ai_report,created_at";

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(displayValue).filter(Boolean).join("、");
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).map(displayValue).filter(Boolean).join("；");
  return "";
}

function toDisplayList(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(toDisplayList).filter(Boolean);
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).flatMap(toDisplayList).filter(Boolean);
  const text = displayValue(value);
  return text ? [text] : [];
}

function normalizeBottlenecks(value: unknown) {
  const values = Array.isArray(value)
    ? value
    : value && typeof value === "object" && !("name" in value) && !("problem" in value)
      ? Object.entries(value as Record<string, unknown>).map(([name, item]) => ({ name, item }))
      : value
        ? [value]
        : [];

  return values.map((value, index) => {
    if (typeof value === "string") return { name: `核心问题${index + 1}`, problem: value };
    if (!value || typeof value !== "object") return { name: `核心问题${index + 1}`, problem: displayValue(value) };
    const item = value as Record<string, unknown>;
    const nested = item.item && typeof item.item === "object" ? item.item as Record<string, unknown> : item;
    return {
      name: displayValue(nested.name ?? item.name ?? `核心问题${index + 1}`),
      problem: displayValue(nested.problem ?? nested.description ?? nested.content ?? nested),
    };
  }).filter((item) => item.name || item.problem);
}

function formatTimelineDate(value?: string | null) {
  if (!value) return "时间未记录";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "时间未记录" : date.toLocaleString("zh-CN");
}

function getReportTimestamp(report: Record<string, unknown> | null) {
  if (!report) return null;
  const value = report.generated_at ?? report.generatedAt ?? report.created_at ?? report.createdAt;
  return typeof value === "string" ? value : null;
}

function getConsultStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    pending: "待顾问跟进",
    contacted: "顾问已联系",
    scheduled: "已预约沟通",
    completed: "咨询已完成",
    cancelled: "咨询已取消",
  };
  return status ? labels[status] || status : "未提交咨询";
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [analysis, setAnalysis] = useState<SalesAIAnalysis | null>(null);
  const [wechatScript, setWechatScript] = useState<FirstWechatScript | null>(null);
  const [generatingWechat, setGeneratingWechat] = useState(false);
  const [wechatError, setWechatError] = useState("");
  const [followUpAdvice, setFollowUpAdvice] = useState<NextFollowUpAdvice | null>(null);
  const [followUpRecords, setFollowUpRecords] = useState<FollowUpRecord[]>([]);
  const [followUpStatus, setFollowUpStatus] = useState<LeadStatus>("new");
  const [followUpContent, setFollowUpContent] = useState("");
  const [generatingFollowUp, setGeneratingFollowUp] = useState(false);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [followUpError, setFollowUpError] = useState("");
  const [error, setError] = useState("");
  const [analysisSaveError, setAnalysisSaveError] = useState("");

  useEffect(() => {
    void params.then(async ({ id }) => {
      if (!supabase) {
        setError("Supabase 尚未配置");
        return;
      }

      let supportsSalesAnalysis = true;
      let supportsWechatScript = true;
      let supportsFollowUp = true;
      let supportsConsultStatus = true;
      let result = await supabase.from("growth_leads").select(`${baseFields},sales_ai_analysis,first_wechat_script,follow_up_records,next_follow_up_advice,consult_status`).eq("id", id).maybeSingle();

      if (result.error?.message.includes("consult_status")) {
        supportsConsultStatus = false;
        result = await supabase.from("growth_leads").select(`${baseFields},sales_ai_analysis,first_wechat_script,follow_up_records,next_follow_up_advice`).eq("id", id).maybeSingle();
      }

      if (result.error?.message.includes("follow_up_records") || result.error?.message.includes("next_follow_up_advice")) {
        supportsFollowUp = false;
        result = await supabase.from("growth_leads").select(`${baseFields},sales_ai_analysis,first_wechat_script${supportsConsultStatus ? ",consult_status" : ""}`).eq("id", id).maybeSingle();
      }

      if (result.error?.message.includes("first_wechat_script")) {
        supportsWechatScript = false;
        result = await supabase.from("growth_leads").select(`${baseFields},sales_ai_analysis${supportsConsultStatus ? ",consult_status" : ""}`).eq("id", id).maybeSingle();
      }

      if (result.error?.message.includes("sales_ai_analysis")) {
        supportsSalesAnalysis = false;
        result = await supabase.from("growth_leads").select(`${baseFields}${supportsConsultStatus ? ",consult_status" : ""}`).eq("id", id).maybeSingle();
      }

      if (result.error) {
        setError(result.error.message);
        return;
      }

      if (!result.data) {
        setError("未找到该客户记录");
        return;
      }

      const nextLead = {
        ...result.data,
        sales_ai_analysis: supportsSalesAnalysis ? result.data.sales_ai_analysis : null,
        first_wechat_script: supportsWechatScript ? result.data.first_wechat_script : null,
        follow_up_records: supportsFollowUp && Array.isArray(result.data.follow_up_records) ? result.data.follow_up_records : [],
        next_follow_up_advice: supportsFollowUp ? result.data.next_follow_up_advice : null,
        consult_status: supportsConsultStatus ? result.data.consult_status : null,
      } as Lead;
      const nextAnalysis = nextLead.sales_ai_analysis || generateSalesAIAnalysis(nextLead);
      setLead(nextLead);
      setAnalysis(nextAnalysis);
      setWechatScript(nextLead.first_wechat_script);
      setFollowUpRecords(nextLead.follow_up_records);
      setFollowUpAdvice(nextLead.next_follow_up_advice);
      setFollowUpStatus(normalizeLeadStatus(nextLead.lead_status));

      if (!supportsFollowUp) {
        setFollowUpError("请先执行 CRM 跟进系统数据库迁移，以保存跟进记录和 AI 建议。");
      }

      if (!nextLead.sales_ai_analysis) {
        if (!supportsSalesAnalysis) {
          setAnalysisSaveError("销售分析已生成；请先执行 sales_ai_analysis 数据库迁移以保存结果。");
          return;
        }

        const saveResponse = await fetch(`/api/admin/leads/${id}/sales-analysis`, { method: "POST" });
        const saveData = await saveResponse.json() as { analysis?: SalesAIAnalysis; error?: string };
        if (saveResponse.ok && saveData.analysis) setAnalysis(saveData.analysis);
        else setAnalysisSaveError(`销售分析保存失败：${saveData.error || "未知错误"}`);
      }
    });
  }, [params]);

  async function generateWechatScript() {
    setGeneratingWechat(true);
    setWechatError("");
    const { id } = await params;

    try {
      const response = await fetch(`/api/admin/leads/${id}/wechat-script`, { method: "POST" });
      const data = await response.json() as { script?: FirstWechatScript; error?: string };
      if (!response.ok || !data.script) throw new Error(data.error || "微信沟通方案生成失败");
      setWechatScript(data.script);
    } catch (error) {
      setWechatError(error instanceof Error ? error.message : "微信沟通方案生成失败");
    } finally {
      setGeneratingWechat(false);
    }
  }

  async function generateFollowUpAdvice() {
    setGeneratingFollowUp(true);
    setFollowUpError("");
    const { id } = await params;

    try {
      const response = await fetch(`/api/admin/leads/${id}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", status: followUpStatus }),
      });
      const data = await response.json() as { advice?: NextFollowUpAdvice; error?: string };
      if (!response.ok || !data.advice) throw new Error(data.error || "AI跟进建议生成失败");
      setFollowUpAdvice(data.advice);
    } catch (error) {
      setFollowUpError(error instanceof Error ? error.message : "AI跟进建议生成失败");
    } finally {
      setGeneratingFollowUp(false);
    }
  }

  async function saveFollowUpRecord() {
    if (!followUpContent.trim()) {
      setFollowUpError("请填写本次销售跟进记录");
      return;
    }

    setSavingFollowUp(true);
    setFollowUpError("");
    const { id } = await params;

    try {
      const response = await fetch(`/api/admin/leads/${id}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "record", content: followUpContent, status: followUpStatus }),
      });
      const data = await response.json() as { records?: FollowUpRecord[]; lead_status?: LeadStatus; error?: string };
      if (!response.ok || !data.records || !data.lead_status) throw new Error(data.error || "跟进记录保存失败");
      setFollowUpRecords(data.records);
      setFollowUpContent("");
      setLead((current) => current ? { ...current, lead_status: data.lead_status } : current);
    } catch (error) {
      setFollowUpError(error instanceof Error ? error.message : "跟进记录保存失败");
    } finally {
      setSavingFollowUp(false);
    }
  }

  if (error) return <main className="container section"><div className="card admin-state">加载失败：{error}</div></main>;
  if (!lead || !analysis) return <main className="container section"><div className="card admin-state">正在生成客户销售分析…</div></main>;

  const report = lead.ai_report;
  const reportData = report && typeof report === "object" ? report as GeneratedGrowthReport & Record<string, unknown> : null;
  const coreProblems = getCoreProblems(lead);
  const primaryProblem = coreProblems[0];
  const customerLevel = getCustomerLevel(lead);
  const levelReason = getCustomerLevelReason(lead, customerLevel);
  const dealScore = getDealScore(lead);
  const followUp = getFollowUpRecommendation(lead);
  const ninetyDayPath = reportData?.ninetyDayPath && typeof reportData.ninetyDayPath === "object"
    ? reportData.ninetyDayPath as unknown as Record<string, unknown>
    : {};
  const ninetyDayActions = [
    ...toDisplayList(ninetyDayPath.days0to30 ?? ninetyDayPath.days0To30 ?? ninetyDayPath.days1_30 ?? ninetyDayPath["0-30"]),
    ...toDisplayList(ninetyDayPath.days31to60 ?? ninetyDayPath.days30To60 ?? ninetyDayPath.days31_60 ?? ninetyDayPath["30-60"]),
    ...toDisplayList(ninetyDayPath.days61to90 ?? ninetyDayPath.days60To90 ?? ninetyDayPath.days61_90 ?? ninetyDayPath["60-90"]),
  ];
  const reportBottlenecks = normalizeBottlenecks(reportData?.topBottlenecks ?? reportData?.bottlenecks);
  const reportAdvice = toDisplayList(reportData?.aiGrowthAdvice ?? reportData?.aiAdvice ?? reportData?.recommendation);
  const serviceScores = Array.isArray(reportData?.capabilityAnalysis)
    ? Object.fromEntries(reportData.capabilityAnalysis.map((item) => [item.name, Number(item.score) || 0]))
    : {};
  const recommendedService = recommendGrowthServices({
    growthIndex: lead.total_score,
    growthLevel: lead.growth_level,
    scores: serviceScores,
    bottlenecks: coreProblems,
    report,
  })[0];
  const customerFocus = lead.sales_note?.replace(/^当前最大增长问题：/, "").trim() || primaryProblem;
  const reportTimestamp = getReportTimestamp(reportData) || (report ? lead.created_at : null);
  const timelineItems = [
    { id: "created", title: "客户创建", description: "客户进入 GrowthOS CRM", created_at: lead.created_at },
    ...(report ? [{ id: "report", title: "AI报告生成", description: "企业增长诊断报告已生成并保存", created_at: reportTimestamp || lead.created_at }] : []),
    ...(wechatScript?.generated_at ? [{ id: "wechat", title: "首次微信方案生成", description: "AI首次沟通方案已准备", created_at: wechatScript.generated_at }] : []),
    ...followUpRecords.map((record) => ({
      id: record.id,
      title: `销售跟进 · ${getLeadStatusLabel(record.status)}`,
      description: record.content,
      created_at: record.created_at,
    })),
  ].sort((first, second) => new Date(first.created_at).getTime() - new Date(second.created_at).getTime());

  return (
    <main className="container section">
      <div className="admin-detail-header row">
        <div>
          <a className="muted" href="/admin">← 返回客户列表</a>
          <h1>{lead.company_name}</h1>
          <p className="muted">CRM客户详情</p>
        </div>
        <div className="admin-score"><strong>{lead.total_score}</strong><span>{lead.growth_level}</span></div>
      </div>

      <section className="card admin-profile">
        <h2>客户信息</h2>
        <div className="admin-detail-grid">
          <p><b>企业名称</b>{lead.company_name}</p>
          <p><b>所属行业</b>{lead.industry || "-"}</p>
          <p><b>企业规模</b>{lead.company_size || "-"}</p>
          <p><b>联系人</b>{lead.contact_name}</p>
          <p><b>手机号</b>{lead.phone}</p>
          <p><b>微信号</b>{lead.wechat || "-"}</p>
          <p><b>增长指数</b>{lead.total_score}</p>
          <p><b>增长阶段</b>{lead.growth_level}</p>
          <p><b>客户状态</b>{getLeadStatusLabel(lead.lead_status)} <small>{normalizeLeadStatus(lead.lead_status)}</small></p>
        </div>
      </section>

      <section className="card consultation-needs">
        <div className="follow-up-section-header">
          <div><span className="eyebrow">企业增长咨询</span><h2>咨询需求</h2></div>
          <span className="consult-status-badge">{getConsultStatusLabel(lead.consult_status)}</span>
        </div>
        <div className="consultation-needs-grid">
          <article><span>AI推荐方案</span><h3>{recommendedService?.name || "企业增长陪跑方案"}</h3><p>{recommendedService?.reason || "建议结合企业诊断结果进一步制定增长方案。"}</p></article>
          <article><span>客户关注方向</span><h3>{customerFocus}</h3><p>建议首次沟通时优先确认该问题的业务影响、紧迫程度和决策目标。</p></article>
          <article><span>咨询状态</span><h3>{getConsultStatusLabel(lead.consult_status)}</h3><p>{lead.consult_status === "pending" ? "客户咨询需求已进入待跟进队列。" : "根据当前状态安排下一步顾问沟通。"}</p></article>
        </div>
      </section>

      <section className="card follow-up-timeline" id="follow-up-timeline">
        <div className="follow-up-section-header">
          <div><span className="eyebrow">客户旅程</span><h2>跟进时间轴</h2></div>
          <span className={`lead-status-badge status-${normalizeLeadStatus(lead.lead_status)}`}>{getLeadStatusLabel(lead.lead_status)}</span>
        </div>
        <div className="timeline-list">
          {timelineItems.map((item) => (
            <article key={item.id}>
              <span className="timeline-dot" />
              <div><time>{formatTimelineDate(item.created_at)}</time><h3>{item.title}</h3><p>{item.description}</p></div>
            </article>
          ))}
        </div>
        <div className="follow-up-entry">
          <div className="follow-up-entry-fields">
            <select value={followUpStatus} onChange={(event) => setFollowUpStatus(event.target.value as LeadStatus)}>
              {LEAD_STATUSES.map((status) => <option key={status} value={status}>{getLeadStatusLabel(status)} · {status}</option>)}
            </select>
            <textarea value={followUpContent} onChange={(event) => setFollowUpContent(event.target.value)} placeholder="记录本次沟通结果、客户反馈或下一步约定" rows={3} />
          </div>
          <button className="btn secondary" type="button" onClick={() => void saveFollowUpRecord()} disabled={savingFollowUp}>
            {savingFollowUp ? "保存中…" : "保存跟进记录"}
          </button>
        </div>
        {followUpError ? <p className="sales-analysis-warning">{followUpError}</p> : null}
      </section>

      <section className="card sales-assistant">
        <div className="sales-assistant-header">
          <div><span className="eyebrow">AI销售助手</span><h2>AI成交建议</h2></div>
          <div className="sales-assistant-score"><strong>{dealScore}</strong><span>AI成交评分</span><span className={`sales-level ${customerLevel}`}>{customerLevel}</span></div>
        </div>
        <p className="sales-level-reason"><strong>成交优先级判断：</strong>{levelReason}</p>
        {analysisSaveError ? <p className="sales-analysis-warning">{analysisSaveError}</p> : null}

        <div className="sales-section">
          <h3>客户画像</h3>
          <div className="sales-profile-grid">
            <p><span>行业</span><strong>{lead.industry || "暂未填写"}</strong></p>
            <p><span>企业规模</span><strong>{lead.company_size || "暂未填写"}</strong></p>
            <p><span>增长阶段</span><strong>{lead.growth_level}</strong></p>
            <p><span>增长指数</span><strong>{lead.total_score}</strong></p>
          </div>
        </div>

        <div className="sales-section">
          <h3>核心需求</h3>
          <div className="sales-problem-list">
            {coreProblems.map((problem, index) => <p key={`${problem}-${index}`}><span>{index + 1}</span>{problem}</p>)}
          </div>
        </div>

        <div className="sales-section">
          <h3>客户购买可能性</h3>
          <div className="sales-purchase-card">
            <div><strong>{dealScore}分</strong><span>预计成交概率</span></div>
            <p><b>推荐动作：{followUp.action}</b><br />{followUp.reason}</p>
          </div>
        </div>

        <div className="sales-section">
          <h3>推荐沟通策略</h3>
          <div className="sales-strategy-grid">
            <article>
              <span className="sales-stage-label">第一次沟通</span>
              <h4>目标：建立信任，不直接销售</h4>
              <p>围绕客户当前的“{primaryProblem}”展开交流，先确认真实业务场景和决策背景。</p>
              <strong>推荐问题</strong>
              <blockquote>“您目前企业增长过程中，最大的挑战是什么？”</blockquote>
            </article>
            <article>
              <span className="sales-stage-label">第二次沟通</span>
              <h4>目标：进入90天增长方案</h4>
              <p>结合首次沟通反馈和企业诊断数据，明确优先级、关键动作和预期结果，引导客户进入方案共创。</p>
            </article>
          </div>
          <p className="sales-strategy-summary">{analysis?.sales_strategy || analysis?.communication_strategy || analysis?.strategy || "建议先围绕客户核心瓶颈建立信任，再逐步引导进入90天增长方案。"}</p>
        </div>

        <div className="sales-section wechat-assistant">
          <div className="wechat-assistant-header">
            <div><span className="eyebrow">微信销售方案</span><h3>AI首次沟通助手</h3></div>
            <button className="btn" type="button" onClick={() => void generateWechatScript()} disabled={generatingWechat}>
              {generatingWechat ? "AI生成中…" : "生成微信沟通方案"}
            </button>
          </div>
          {wechatError ? <p className="sales-analysis-warning">生成失败：{wechatError}</p> : null}
          {wechatScript ? (
            <div className="wechat-script-grid">
              <article><span>1</span><div><h4>开场白</h4><p>{wechatScript?.opening || "暂无内容"}</p></div></article>
              <article><span>2</span><div><h4>客户痛点切入</h4><p>{wechatScript?.pain_point || "暂无内容"}</p></div></article>
              <article><span>3</span><div><h4>产品价值介绍</h4><p>{wechatScript?.value_introduction || "暂无内容"}</p></div></article>
              <article><span>4</span><div><h4>下一步行动建议</h4><p>{wechatScript?.next_action || "暂无内容"}</p></div></article>
            </div>
          ) : <div className="wechat-script-empty">点击按钮，AI将基于客户企业信息、增长指数、核心问题和诊断报告生成首次微信沟通方案。</div>}
        </div>

        <div className="sales-section next-follow-up-assistant">
          <div className="wechat-assistant-header">
            <div><span className="eyebrow">AI客户跟进</span><h3>AI下一步跟进建议</h3></div>
            <button className="btn" type="button" onClick={() => void generateFollowUpAdvice()} disabled={generatingFollowUp}>
              {generatingFollowUp ? "AI分析中…" : "生成下一步建议"}
            </button>
          </div>
          {followUpAdvice ? (
            <div className="next-follow-up-grid">
              <article><span>01</span><div><h4>当前客户状态</h4><p>{followUpAdvice?.current_status || "暂无内容"}</p></div></article>
              <article><span>02</span><div><h4>推荐跟进时间</h4><p>{followUpAdvice?.recommended_time || "暂无内容"}</p></div></article>
              <article><span>03</span><div><h4>推荐沟通策略</h4><p>{followUpAdvice?.communication_strategy || "暂无内容"}</p></div></article>
              <article className="follow-up-message"><span>04</span><div><h4>微信跟进话术</h4><p>{followUpAdvice?.wechat_message || "暂无内容"}</p></div></article>
            </div>
          ) : <div className="wechat-script-empty">AI将结合客户状态、历史跟进记录、增长指数和诊断报告，给出明确的下一步跟进动作。</div>}
        </div>
      </section>

      <section className="card admin-report">
        <h2>AI诊断报告</h2>
        {report ? (
          <>
            <div><h3>当前状态</h3><p>{displayValue(reportData?.currentGrowthState) || "暂无当前增长状态数据。"}</p></div>
            <div><h3>核心问题</h3>{reportBottlenecks.length ? reportBottlenecks.map((item, index) => <p key={`${item.name}-${index}`}>{index + 1}. {item.name}：{item.problem}</p>) : <p className="muted">暂无核心问题数据。</p>}</div>
            <div><h3>90天行动计划</h3>{ninetyDayActions.length ? ninetyDayActions.map((item, index) => <p key={`${displayValue(item)}-${index}`}>{index + 1}. {displayValue(item)}</p>) : <p className="muted">暂无90天行动计划数据。</p>}</div>
            <div><h3>AI建议</h3>{reportAdvice.length ? reportAdvice.map((item, index) => <p key={`${item}-${index}`}>{index + 1}. {item}</p>) : <p className="muted">暂无AI建议数据。</p>}</div>
          </>
        ) : <p className="muted">该客户记录暂无 AI 诊断报告快照。新提交的完整报告会自动保存。</p>}
      </section>
    </main>
  );
}
