"use client";

import { FormEvent, useEffect, useState } from "react";
import type { GeneratedGrowthReport } from "@/lib/ai/report-generator";
import { supabase } from "@/lib/supabase";
import "./consult.css";

type ConsultForm = {
  contact_name: string;
  phone: string;
  wechat: string;
  company_name: string;
  growth_problem: string;
};

type ConsultContext = {
  industry: string;
  company_size: string;
  total_score: number;
  ai_report: GeneratedGrowthReport | null;
};

type StoredCompanyInfo = Partial<ConsultForm> & {
  name?: string;
  industry?: string;
  company_size?: string;
};

type StoredLead = Partial<ConsultForm> & {
  industry?: string;
  company_size?: string;
  total_score?: number;
};

type StoredReport = {
  index?: number;
  industry?: string;
  employees?: string;
};

const initialForm: ConsultForm = {
  contact_name: "",
  phone: "",
  wechat: "",
  company_name: "",
  growth_problem: "",
};

const initialContext: ConsultContext = {
  industry: "",
  company_size: "",
  total_score: 0,
  ai_report: null,
};

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

function getGrowthLevel(score: number) {
  if (score >= 90) return "增长领先型";
  if (score >= 70) return "高速成长型";
  if (score >= 40) return "增长突破型";
  return "增长探索型";
}

export default function ConsultPage() {
  const [form, setForm] = useState<ConsultForm>(initialForm);
  const [context, setContext] = useState<ConsultContext>(initialContext);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const companyInfo = readJson<StoredCompanyInfo>("growthos-company-info");
    const storedLead = readJson<StoredLead>("growthos-report-lead");
    const report = readJson<StoredReport>("growthos-result");
    const aiReport = readJson<GeneratedGrowthReport>("growthos-ai-report");

    setForm((current) => ({
      ...current,
      contact_name: companyInfo?.name || companyInfo?.contact_name || storedLead?.contact_name || "",
      phone: companyInfo?.phone || storedLead?.phone || "",
      wechat: companyInfo?.wechat || storedLead?.wechat || "",
      company_name: companyInfo?.company_name || storedLead?.company_name || "",
    }));
    setContext({
      industry: companyInfo?.industry || storedLead?.industry || report?.industry || "",
      company_size: companyInfo?.company_size || storedLead?.company_size || report?.employees || "",
      total_score: Math.max(0, Math.min(100, Math.round(report?.index ?? storedLead?.total_score ?? 0))),
      ai_report: aiReport,
    });
  }, []);

  function update(field: keyof ConsultForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    if (!supabase) {
      setSubmitting(false);
      setError("Supabase 尚未配置，请检查 .env.local。");
      return;
    }

    const payload = {
      company_name: form.company_name.trim(),
      industry: context.industry,
      company_size: context.company_size,
      contact_name: form.contact_name.trim(),
      phone: form.phone.trim(),
      wechat: form.wechat.trim(),
      total_score: context.total_score,
      growth_level: getGrowthLevel(context.total_score),
      ai_report: context.ai_report,
      lead_status: "qualified",
      consult_status: "pending",
      sales_note: `当前最大增长问题：${form.growth_problem.trim()}`,
      created_at: new Date().toISOString(),
    };

    let { error: submitError } = await supabase.from("growth_leads").insert(payload);
    if (submitError?.message.includes("consult_status")) {
      const { consult_status: _consultStatus, ...legacyPayload } = payload;
      ({ error: submitError } = await supabase.from("growth_leads").insert(legacyPayload));
    }
    setSubmitting(false);

    if (submitError) {
      setError(`提交失败：${submitError.message}`);
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="container section">
        <section className="card consult-success">
          <span className="eyebrow consult-success-badge">✓ 预约成功</span>
          <h1>您的企业增长方案预约已提交</h1>
          <p className="muted">AI增长顾问将结合本次诊断和您的关注方向，进一步准备企业专属增长路径。</p>
          <a className="btn" href="/report">返回查看增长报告</a>
        </section>
      </main>
    );
  }

  return (
    <main className="container section">
      <div className="consult-shell">
        <div className="section-heading consult-heading">
          <span className="eyebrow">AI增长咨询</span>
          <h1>预约您的企业增长方案</h1>
          <p className="muted">AI顾问将根据您的诊断结果，进一步制定企业增长路径。</p>
        </div>

        <section className="consult-value-card">
          <strong>本次咨询将重点帮助您</strong>
          <div><span>✓ 明确当前最优先增长瓶颈</span><span>✓ 匹配适合企业的增长模型</span><span>✓ 制定下一阶段执行路径</span></div>
        </section>

        <form className="card consult-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="contact_name">姓名</label>
              <input id="contact_name" value={form.contact_name} onChange={(event) => update("contact_name", event.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="phone">手机号</label>
              <input id="phone" type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="wechat">微信号</label>
              <input id="wechat" value={form.wechat} onChange={(event) => update("wechat", event.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="company_name">企业名称</label>
              <input id="company_name" value={form.company_name} onChange={(event) => update("company_name", event.target.value)} required />
            </div>
          </div>
          <div className="field">
            <label htmlFor="growth_problem">希望解决的问题</label>
            <textarea id="growth_problem" value={form.growth_problem} onChange={(event) => update("growth_problem", event.target.value)} placeholder="例如：获客成本持续上升，但销售转化率没有明显提升。" rows={5} required />
          </div>
          {error ? <p className="consult-error">{error}</p> : null}
          <button className="btn consult-submit" disabled={submitting}>{submitting ? "提交中…" : "提交预约"}</button>
        </form>
      </div>
    </main>
  );
}
