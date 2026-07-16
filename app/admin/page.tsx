"use client";

import { useEffect, useMemo, useState } from "react";
import type { GeneratedGrowthReport } from "@/lib/ai/report-generator";
import {
  LEAD_STATUSES,
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
} from "@/lib/ai/sales-assistant";
import { supabase } from "@/lib/supabase";
import "./admin.css";

type SortField = "created_at" | "total_score" | "company_name" | "deal_score";

type Lead = {
  id: string;
  company_name: string;
  industry: string | null;
  company_size: string | null;
  contact_name: string;
  phone: string;
  wechat: string | null;
  total_score: number;
  growth_level: string;
  created_at: string;
  lead_status: LeadStatus;
  sales_note: string | null;
  ai_report: GeneratedGrowthReport | null;
  ai_score?: number | null;
  growth_index?: number | null;
  sales_ai_analysis?: SalesAIAnalysis | null;
  first_wechat_script?: FirstWechatScript | null;
  next_follow_up_advice?: NextFollowUpAdvice | null;
  follow_up_records?: FollowUpRecord[] | null;
};

const activeStatuses = new Set<LeadStatus>(["new", "contacted", "communicating", "qualified", "proposal"]);
const funnelStatuses: Array<{ status: LeadStatus; label: string }> = [
  { status: "new", label: "新客户" },
  { status: "contacted", label: "已联系" },
  { status: "communicating", label: "沟通中" },
  { status: "qualified", label: "高意向" },
  { status: "proposal", label: "方案阶段" },
  { status: "won", label: "成交" },
];

function levelLabel(level: ReturnType<typeof getCustomerLevel>) {
  if (level === "高意向") return "🔥 高意向";
  if (level === "中意向") return "🟡 中意向";
  return "⚪ 低意向";
}

function getLeadDealScore(lead: Lead) {
  return typeof lead.ai_score === "number" && Number.isFinite(lead.ai_score)
    ? Math.round(lead.ai_score)
    : getDealScore(lead);
}

function isToday(value: string) {
  const date = new Date(value);
  const today = new Date();
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
}

function getCurrentCustomerState(lead: Lead) {
  const records = Array.isArray(lead.follow_up_records) ? lead.follow_up_records : [];
  if (normalizeLeadStatus(lead.lead_status) === "new" && lead.ai_report && !records.length) return "报告已生成，待首次沟通";
  return getLeadStatusLabel(lead.lead_status);
}

function getLastFollowUpAt(lead: Lead) {
  const records = Array.isArray(lead.follow_up_records) ? lead.follow_up_records : [];
  return records.reduce<string | null>((latest, record) => {
    if (!latest) return record.created_at;
    return new Date(record.created_at).getTime() > new Date(latest).getTime() ? record.created_at : latest;
  }, null);
}

function getHoursSince(value: string) {
  return Math.max(0, (Date.now() - new Date(value).getTime()) / 3_600_000);
}

function formatLastFollowUp(lead: Lead) {
  const lastFollowUpAt = getLastFollowUpAt(lead);
  if (!lastFollowUpAt) return "暂无跟进记录";
  return new Date(lastFollowUpAt).toLocaleString("zh-CN");
}

function getStagePriority(status: LeadStatus) {
  return ({ new: 4, contacted: 8, communicating: 14, qualified: 20, proposal: 24, won: 0, lost: 0 } satisfies Record<LeadStatus, number>)[status];
}

function getSecretaryPriority(score: number, hoursWithoutFollowUp: number, status: LeadStatus) {
  const urgencyScore = Math.min(30, hoursWithoutFollowUp / 72 * 30);
  const priorityScore = score * .65 + urgencyScore + getStagePriority(status);
  if (priorityScore >= 82 || (score >= 80 && hoursWithoutFollowUp >= 24)) {
    return { level: "must", label: "🔥 今天必须跟进", score: priorityScore };
  }
  if (priorityScore >= 58 || hoursWithoutFollowUp >= 24) {
    return { level: "suggested", label: "🟡 建议跟进", score: priorityScore };
  }
  return { level: "later", label: "⚪ 暂不优先", score: priorityScore };
}

function getSecretaryReason(lead: Lead, score: number, hoursWithoutFollowUp: number) {
  const reportReason = lead.ai_report ? "客户已完成完整增长诊断" : "客户已进入CRM";
  const timeReason = getLastFollowUpAt(lead)
    ? hoursWithoutFollowUp >= 24
      ? `距离上次沟通已${Math.floor(hoursWithoutFollowUp / 24)}天`
      : `距离上次沟通约${Math.max(1, Math.floor(hoursWithoutFollowUp))}小时`
    : `创建后已${hoursWithoutFollowUp >= 24 ? `${Math.floor(hoursWithoutFollowUp / 24)}天` : `${Math.max(1, Math.floor(hoursWithoutFollowUp))}小时`}未记录沟通`;
  const aiContext = lead.next_follow_up_advice?.current_status || getCustomerLevelReason(lead);
  return `${reportReason}，${timeReason}，当前AI成交评分${score}分。${aiContext}`;
}

export default function AdminPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("all");
  const [level, setLevel] = useState("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [descending, setDescending] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generatingScriptId, setGeneratingScriptId] = useState<string | null>(null);
  const [secretaryNotice, setSecretaryNotice] = useState("");

  useEffect(() => {
    async function load() {
      if (!supabase) {
        setError("Supabase 尚未配置");
        setLoading(false);
        return;
      }

      const result = await supabase.from("growth_leads").select("*").order("created_at", { ascending: false });
      if (result.error) setError(result.error.message);
      else setLeads((result.data || []).map((lead) => ({ ...lead, lead_status: normalizeLeadStatus(lead.lead_status) })) as Lead[]);
      setLoading(false);
    }

    void load();
  }, []);

  const industries = useMemo(() => Array.from(new Set(leads.map((lead) => lead.industry).filter(Boolean))) as string[], [leads]);
  const levels = useMemo(() => Array.from(new Set(leads.map((lead) => lead.growth_level))), [leads]);
  const dashboard = useMemo(() => {
    const todayCount = leads.filter((lead) => isToday(lead.created_at)).length;
    const highIntentCount = leads.filter((lead) => getCustomerLevel(lead) === "高意向" && activeStatuses.has(lead.lead_status)).length;
    const pendingCount = leads.filter((lead) => activeStatuses.has(lead.lead_status)).length;
    const averageScore = leads.length ? Math.round(leads.reduce((sum, lead) => sum + getLeadDealScore(lead), 0) / leads.length) : 0;
    return { todayCount, highIntentCount, pendingCount, averageScore };
  }, [leads]);

  const salesSecretaryLeads = useMemo(() => leads
    .filter((lead) => activeStatuses.has(lead.lead_status))
    .map((lead) => {
      const score = getLeadDealScore(lead);
      const hoursWithoutFollowUp = getHoursSince(getLastFollowUpAt(lead) || lead.created_at);
      const savedAdvice = lead.next_follow_up_advice;
      const fallback = getFollowUpRecommendation(lead);
      const priority = getSecretaryPriority(score, hoursWithoutFollowUp, lead.lead_status);
      return {
        lead,
        score,
        hoursWithoutFollowUp,
        priority,
        reason: getSecretaryReason(lead, score, hoursWithoutFollowUp),
        action: savedAdvice?.recommended_time || fallback.action,
      };
    })
    .sort((first, second) => second.priority.score - first.priority.score
      || second.score - first.score
      || second.hoursWithoutFollowUp - first.hoursWithoutFollowUp)
    .slice(0, 5), [leads]);

  const highValueLeads = useMemo(() => leads
    .filter((lead) => !["won", "lost"].includes(lead.lead_status))
    .sort((first, second) => getLeadDealScore(second) - getLeadDealScore(first))
    .slice(0, 5), [leads]);

  const funnelCounts = useMemo(() => Object.fromEntries(funnelStatuses.map(({ status }) => [
    status,
    leads.filter((lead) => lead.lead_status === status).length,
  ])) as Record<LeadStatus, number>, [leads]);

  const filteredLeads = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return leads
      .filter((lead) => {
        const matches = !keyword || [lead.company_name, lead.contact_name, lead.phone, lead.wechat, lead.industry]
          .some((value) => value?.toLowerCase().includes(keyword));
        return matches && (industry === "all" || lead.industry === industry) && (level === "all" || lead.growth_level === level);
      })
      .sort((first, second) => {
        const left = sortField === "total_score"
          ? first.total_score
          : sortField === "deal_score"
            ? getLeadDealScore(first)
            : sortField === "company_name"
              ? first.company_name
              : first.created_at;
        const right = sortField === "total_score"
          ? second.total_score
          : sortField === "deal_score"
            ? getLeadDealScore(second)
            : sortField === "company_name"
              ? second.company_name
              : second.created_at;
        const result = left < right ? -1 : left > right ? 1 : 0;
        return descending ? -result : result;
      });
  }, [leads, search, industry, level, sortField, descending]);

  async function updateLead(id: string, changes: Partial<Pick<Lead, "lead_status" | "sales_note">>) {
    if (!supabase) return;

    if (changes.lead_status) {
      const response = await fetch(`/api/admin/leads/${id}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", status: changes.lead_status }),
      });
      const data = await response.json() as { lead_status?: LeadStatus; error?: string };
      if (!response.ok || !data.lead_status) {
        setError(data.error || "客户状态更新失败");
        return;
      }
      setLeads((current) => current.map((lead) => lead.id === id ? { ...lead, lead_status: data.lead_status as LeadStatus } : lead));
      return;
    }

    const result = await supabase.from("growth_leads").update(changes).eq("id", id);
    if (!result.error) setLeads((current) => current.map((lead) => lead.id === id ? { ...lead, ...changes } : lead));
  }

  async function generateWechatScript(lead: Lead) {
    setGeneratingScriptId(lead.id);
    setSecretaryNotice("");

    try {
      const response = await fetch(`/api/admin/leads/${lead.id}/wechat-script`, { method: "POST" });
      const data = await response.json() as { script?: FirstWechatScript; error?: string };
      if (!response.ok || !data.script) throw new Error(data.error || "微信话术生成失败");
      setLeads((current) => current.map((item) => item.id === lead.id ? { ...item, first_wechat_script: data.script } : item));
      setSecretaryNotice(`${lead.company_name}的微信话术已生成，可进入客户详情查看。`);
    } catch (error) {
      setSecretaryNotice(error instanceof Error ? `生成失败：${error.message}` : "微信话术生成失败");
    } finally {
      setGeneratingScriptId(null);
    }
  }

  return (
    <main className="container section admin-dashboard">
      <div className="admin-header row">
        <div><span className="eyebrow">GrowthOS CRM</span><h1>AI销售驾驶舱</h1><p className="muted">今天有 {dashboard.highIntentCount} 位高意向客户值得优先跟进。</p></div>
        <a className="btn secondary" href="/api/export/leads">Excel导出</a>
      </div>

      <section className="admin-metrics">
        <div className="card metric-card"><span><i>＋</i>今日客户总数</span><strong>{dashboard.todayCount}</strong><small>今日新增客户</small></div>
        <div className="card metric-card"><span><i>🔥</i>高意向客户</span><strong>{dashboard.highIntentCount}</strong><small>优先安排销售沟通</small></div>
        <div className="card metric-card"><span><i>⏰</i>待跟进客户</span><strong>{dashboard.pendingCount}</strong><small>尚未成交或流失</small></div>
        <div className="card metric-card metric-primary"><span><i>AI</i>平均AI成交评分</span><strong>{dashboard.averageScore}<em>分</em></strong><small>平均成交概率</small></div>
      </section>

      <section className="dashboard-insights">
        <div className="card sales-secretary">
          <div className="dashboard-section-header"><div><span className="eyebrow">今日待跟进客户</span><h2>AI销售秘书</h2></div><span>{salesSecretaryLeads.length} 位优先客户</span></div>
          {secretaryNotice ? <p className="secretary-notice">{secretaryNotice}</p> : null}
          <div className="sales-secretary-list">
            {salesSecretaryLeads.map(({ lead, score, priority, reason, action }) => (
              <article key={lead.id}>
                <div className="secretary-customer">
                  <span className={`priority-label priority-${priority.level}`}>{priority.label}</span>
                  <a href={`/admin/leads/${lead.id}`}>{lead.company_name}</a>
                  <p>{lead.contact_name} · {lead.industry || "行业未填写"}</p>
                </div>
                <div className="secretary-facts">
                  <p><span>当前状态</span><strong>{getCurrentCustomerState(lead)}</strong></p>
                  <p><span>AI成交评分</span><strong className="secretary-score">{score}分</strong></p>
                  <p><span>最后跟进时间</span><strong>{formatLastFollowUp(lead)}</strong></p>
                </div>
                <div className="secretary-reason"><span>为什么现在联系？</span><p>{reason}</p></div>
                <div className="secretary-action"><span>AI建议动作</span><strong>{action}</strong></div>
                <div className="secretary-quick-actions">
                  <button className="btn" type="button" onClick={() => void generateWechatScript(lead)} disabled={generatingScriptId === lead.id}>{generatingScriptId === lead.id ? "生成中…" : "生成微信话术"}</button>
                  <a className="btn secondary" href={`/admin/leads/${lead.id}#follow-up-timeline`}>记录跟进</a>
                  <label><span>调整客户状态</span><select value={lead.lead_status} onChange={(event) => void updateLead(lead.id, { lead_status: event.target.value as LeadStatus })}>{LEAD_STATUSES.map((status) => <option key={status} value={status}>{getLeadStatusLabel(status)}</option>)}</select></label>
                </div>
              </article>
            ))}
            {!salesSecretaryLeads.length ? <div className="dashboard-empty">暂无待跟进客户，今天可以重点维护已成交客户。</div> : null}
          </div>
        </div>

        <div className="card sales-funnel">
          <div className="dashboard-section-header"><div><span className="eyebrow">销售进度</span><h2>客户状态统计</h2></div></div>
          <div className="funnel-list">
            {funnelStatuses.map(({ status, label }, index) => (
              <div key={status} className={`funnel-stage funnel-${status}`}>
                <span>{label}</span><strong>{funnelCounts[status] || 0}</strong>{index < funnelStatuses.length - 1 ? <i>↓</i> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card high-value-ranking">
        <div className="dashboard-section-header"><div><span className="eyebrow">成交优先级</span><h2>高价值客户</h2></div><span>按AI成交评分排序</span></div>
        <div className="ranking-table-wrap">
          <table>
            <thead><tr><th>排名</th><th>客户名称</th><th>行业</th><th>成交评分</th><th>当前状态</th><th>下一步动作</th></tr></thead>
            <tbody>{highValueLeads.map((lead, index) => {
              const savedAdvice = lead.next_follow_up_advice;
              const fallback = getFollowUpRecommendation(lead);
              return <tr key={lead.id}>
                <td><span className={`ranking-number rank-${index + 1}`}>{index + 1}</span></td>
                <td><a className="admin-company-link" href={`/admin/leads/${lead.id}`}>{lead.company_name}</a><small>{lead.contact_name}</small></td>
                <td>{lead.industry || "-"}</td>
                <td><strong className="ranking-score">{getLeadDealScore(lead)}分</strong></td>
                <td><span className={`lead-status-badge status-${lead.lead_status}`}>{getLeadStatusLabel(lead.lead_status)}</span></td>
                <td><strong>{savedAdvice?.recommended_time || fallback.action}</strong></td>
              </tr>;
            })}</tbody>
          </table>
          {!highValueLeads.length ? <div className="dashboard-empty">暂无可跟进的高价值客户。</div> : null}
        </div>
      </section>

      <div className="card admin-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索企业、联系人、手机号或微信号" />
        <select value={industry} onChange={(event) => setIndustry(event.target.value)}><option value="all">全部行业</option>{industries.map((item) => <option key={item}>{item}</option>)}</select>
        <select value={level} onChange={(event) => setLevel(event.target.value)}><option value="all">全部增长阶段</option>{levels.map((item) => <option key={item}>{item}</option>)}</select>
        <select value={sortField} onChange={(event) => setSortField(event.target.value as SortField)}><option value="created_at">按提交时间</option><option value="deal_score">按成交评分</option><option value="total_score">按增长指数</option><option value="company_name">按企业名称</option></select>
        <button className="btn secondary" onClick={() => setDescending((value) => !value)}>{descending ? "降序" : "升序"}</button>
      </div>

      {loading ? <div className="card admin-state">正在加载客户数据…</div> : error ? <div className="card admin-state">加载失败：{error}</div> : (
        <div className="card admin-table">
          <div className="admin-table-scroll">
            <table>
              <thead><tr><th>企业</th><th>意向等级</th><th>AI成交评分</th><th>推荐跟进动作</th><th>联系人</th><th>手机号</th><th>增长指数</th><th>客户状态</th><th>销售备注</th><th>提交时间</th></tr></thead>
              <tbody>
                {filteredLeads.map((lead) => {
                  const customerLevel = getCustomerLevel(lead);
                  const dealScore = getLeadDealScore(lead);
                  const recommendation = getFollowUpRecommendation(lead);
                  return (
                    <tr key={lead.id}>
                      <td><a className="admin-company-link" href={`/admin/leads/${lead.id}`}>{lead.company_name}</a><div className="muted">{lead.industry || "-"} · {lead.company_size || "-"}</div></td>
                      <td><span className={`intent-badge ${customerLevel}`}>{levelLabel(customerLevel)}</span></td>
                      <td><div className="deal-score"><strong>{dealScore}</strong><span>成交概率</span></div></td>
                      <td className="follow-up-cell"><strong>建议：{recommendation.action}</strong><p>原因：{recommendation.reason}</p></td>
                      <td>{lead.contact_name}</td>
                      <td>{lead.phone}</td>
                      <td><strong>{lead.total_score}</strong></td>
                      <td><select className={`lead-status-select status-${lead.lead_status}`} value={lead.lead_status} onChange={(event) => void updateLead(lead.id, { lead_status: event.target.value as LeadStatus })}>{LEAD_STATUSES.map((status) => <option key={status} value={status}>{getLeadStatusLabel(status)}</option>)}</select></td>
                      <td><input className="admin-note-input" defaultValue={lead.sales_note || ""} onBlur={(event) => void updateLead(lead.id, { sales_note: event.target.value })} placeholder="添加备注" /></td>
                      <td>{new Date(lead.created_at).toLocaleString("zh-CN")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!filteredLeads.length ? <p className="muted admin-empty">没有符合条件的客户。</p> : null}
          </div>
        </div>
      )}
    </main>
  );
}
