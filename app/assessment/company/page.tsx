"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Nav from "@/components/Nav";

type CompanyAssessmentInfo = {
  name: string;
  phone: string;
  wechat: string;
  company_name: string;
  industry: string;
  company_size: string;
  revenue: string;
};

const initialInfo: CompanyAssessmentInfo = {
  name: "",
  phone: "",
  wechat: "",
  company_name: "",
  industry: "",
  company_size: "",
  revenue: "",
};

const industries = [
  "科技互联网",
  "制造业",
  "教育培训",
  "医疗健康",
  "零售电商",
  "企业服务",
  "金融服务",
  "其他",
];

const companySizes = ["1-10人", "11-50人", "51-200人", "201-500人", "500人以上"];

const revenues = [
  "100万以下",
  "100万-500万",
  "500万-1000万",
  "1000万-3000万",
  "3000万-1亿元",
  "1亿元以上",
];

export default function CompanyInfoPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [info, setInfo] = useState<CompanyAssessmentInfo>(initialInfo);

  useEffect(() => {
    const saved = localStorage.getItem("growthos-company-info");
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as Partial<CompanyAssessmentInfo> & {
        contact_name?: string;
      };
      setInfo({
        ...initialInfo,
        ...parsed,
        name: parsed.name || parsed.contact_name || "",
      });
    } catch {
      setInfo(initialInfo);
    }
  }, []);

  function update(field: keyof CompanyAssessmentInfo, value: string) {
    setInfo((current) => ({ ...current, [field]: value }));
  }

  function saveAndContinue(nextInfo: CompanyAssessmentInfo) {
    const savedInfo = {
      ...nextInfo,
      contact_name: nextInfo.name,
    };

    localStorage.setItem("growthos-company-info", JSON.stringify(savedInfo));
    localStorage.setItem(
      "growthos-progress",
      JSON.stringify({
        info: {
          name: nextInfo.name,
          phone: nextInfo.phone,
          wechat: nextInfo.wechat,
          company: nextInfo.company_name,
          industry: nextInfo.industry,
          employees: nextInfo.company_size,
          revenue: nextInfo.revenue,
        },
        answers: {},
        step: 1,
      })
    );
    window.location.href = "/assessment";
  }

  function getFormInfo(form: HTMLFormElement): CompanyAssessmentInfo {
    const formData = new FormData(form);
    return {
      name: String(formData.get("name") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      wechat: String(formData.get("wechat") || "").trim(),
      company_name: String(formData.get("company_name") || "").trim(),
      industry: String(formData.get("industry") || ""),
      company_size: String(formData.get("company_size") || ""),
      revenue: String(formData.get("revenue") || ""),
    };
  }

  function continueFromForm(form: HTMLFormElement) {
    const nextInfo = getFormInfo(form);

    if (
      nextInfo.name &&
      nextInfo.phone &&
      nextInfo.company_name &&
      nextInfo.industry &&
      nextInfo.company_size &&
      nextInfo.revenue
    ) {
      setInfo(nextInfo);
      saveAndContinue(nextInfo);
    } else {
      form.reportValidity();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    continueFromForm(event.currentTarget);
  }

  const canSubmit = Boolean(
    info.name.trim() &&
      info.phone.trim() &&
      info.company_name.trim() &&
      info.industry &&
      info.company_size &&
      info.revenue
  );

  return (
    <>
      <Nav />
      <main className="section">
        <div className="container form-shell">
          <div className="section-heading">
            <span className="eyebrow">企业信息</span>
            <h1>先认识一下您的企业</h1>
            <p className="muted">这些信息将用于生成企业增长指数和专属诊断报告，只需填写一次。</p>
          </div>

          <form className="card form-card" ref={formRef} onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="name">姓名</label>
                <input
                  id="name"
                  name="name"
                  value={info.name}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder="请输入姓名"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="phone">手机号</label>
                <input
                  id="phone"
                  name="phone"
                  value={info.phone}
                  onChange={(event) => update("phone", event.target.value)}
                  placeholder="请输入手机号"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="wechat">微信号</label>
              <input
                id="wechat"
                name="wechat"
                value={info.wechat}
                onChange={(event) => update("wechat", event.target.value)}
                placeholder="请输入微信号"
              />
            </div>

            <div className="field">
              <label htmlFor="company_name">公司名称</label>
              <input
                id="company_name"
                name="company_name"
                value={info.company_name}
                onChange={(event) => update("company_name", event.target.value)}
                placeholder="请输入公司名称"
                required
              />
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="industry">所属行业</label>
                <select
                  id="industry"
                  name="industry"
                  value={info.industry}
                  onChange={(event) => update("industry", event.target.value)}
                  required
                >
                  <option value="">请选择行业</option>
                  {industries.map((industry) => (
                    <option value={industry} key={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="company_size">团队人数</label>
                <select
                  id="company_size"
                  name="company_size"
                  value={info.company_size}
                  onChange={(event) => update("company_size", event.target.value)}
                  required
                >
                  <option value="">请选择团队人数</option>
                  {companySizes.map((size) => (
                    <option value={size} key={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="revenue">年度营收</label>
              <select
                id="revenue"
                name="revenue"
                value={info.revenue}
                onChange={(event) => update("revenue", event.target.value)}
                required
              >
                <option value="">请选择年度营收</option>
                {revenues.map((revenue) => (
                  <option value={revenue} key={revenue}>
                    {revenue}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-actions">
              <a href="/" className="btn secondary">
                返回首页
              </a>
              <button
                className="btn"
                type="button"
                onClick={() => formRef.current && continueFromForm(formRef.current)}
              >
                下一步
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
