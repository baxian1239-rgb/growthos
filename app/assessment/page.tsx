"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { questions } from "@/data/questions";
import { calculate } from "@/lib/scoring";
import { supabase } from "@/lib/supabase";
import type { CompanyInfo } from "@/types";

type StoredCompanyInfo = CompanyInfo & {
  wechat?: string;
};

const emptyInfo: StoredCompanyInfo = {
  name: "",
  phone: "",
  wechat: "",
  company: "",
  industry: "",
  employees: "",
  revenue: "",
};

const QUESTIONS_PER_PAGE = 4;
const TOTAL_STEPS = Math.ceil(questions.length / QUESTIONS_PER_PAGE);

export default function Assessment() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [info, setInfo] = useState<StoredCompanyInfo>(emptyInfo);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("growthos-progress");
    if (!raw) {
      router.replace("/assessment/company");
      return;
    }

    try {
      const progress = JSON.parse(raw) as {
        info?: StoredCompanyInfo;
        answers?: Record<number, number>;
        step?: number;
      };

      const nextInfo = { ...emptyInfo, ...(progress.info || {}) };
      if (!nextInfo.name || !nextInfo.phone || !nextInfo.company) {
        router.replace("/assessment/company");
        return;
      }

      setInfo(nextInfo);
      setAnswers(progress.answers || {});
      setStep(Math.min(Math.max(progress.step || 1, 1), TOTAL_STEPS));
    } catch {
      router.replace("/assessment/company");
    }
  }, [router]);

  useEffect(() => {
    const serializedProgress = JSON.stringify({ info, answers, step });
    localStorage.setItem("growthos-progress", serializedProgress);
    sessionStorage.setItem("growthos-progress", serializedProgress);
  }, [info, answers, step]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const currentQuestions = useMemo(
    () => questions.slice((step - 1) * QUESTIONS_PER_PAGE, step * QUESTIONS_PER_PAGE),
    [step]
  );
  const pageDone = currentQuestions.every((question) => answers[question.id]);

  function selectAnswer(questionId: number, score: number) {
    setAnswers((current) => ({ ...current, [questionId]: score }));
  }

  function goToStep(nextStep: number) {
    setStep(Math.min(Math.max(nextStep, 1), TOTAL_STEPS));
  }

  async function submit() {
    setSaving(true);
    const result = calculate(answers);
    const payload = {
      ...info,
      answers,
      score: result.index,
      level: result.level,
      engine_scores: result.engines,
    };

    const completedResult = { ...payload, ...result };
    const serializedResult = JSON.stringify(completedResult);
    localStorage.setItem("growthos-result", serializedResult);
    sessionStorage.setItem("growthos-result", serializedResult);
    localStorage.removeItem("assessment_id");
    sessionStorage.removeItem("assessment_id");

    let assessmentId = "";

    if (supabase) {
      const insertResult = await supabase.from("assessment_records").insert(payload).select("id").maybeSingle();
      assessmentId = insertResult.data?.id ? String(insertResult.data.id) : "";
      if (assessmentId) {
        localStorage.setItem("assessment_id", assessmentId);
        sessionStorage.setItem("assessment_id", assessmentId);
      }
    }

    const reportUrl = assessmentId ? `/report?assessment_id=${assessmentId}` : "/report";
    setTimeout(() => router.push(reportUrl), 700);
  }

  return (
    <main className="container section">
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div className="row" style={{ alignItems: "center" }}>
          <div>
            <div className="brand">企业10倍增长评测</div>
            <p className="muted">接下来通过28道问题，AI将分析企业增长能力并生成专属报告。</p>
          </div>
          <div className="muted">
            第 {step} / {TOTAL_STEPS} 页
          </div>
        </div>

        <div className="progress">
          <div style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>

        <div className="card" style={{ marginTop: 24 }}>
          <h1 style={{ marginTop: 0 }}>开始企业10倍增长评测</h1>
          <p className="muted">
            {info.company} · {info.industry} · {info.employees}
          </p>
        </div>

        <div>
          {currentQuestions.map((question) => (
            <div className="card question" key={question.id}>
              <div className="muted">
                {question.category} · {question.id}/28
              </div>
              <h3>{question.question}</h3>
              {question.options.map((option, index) => (
                <button
                  key={option.text}
                  className={`option ${answers[question.id] === option.score ? "active" : ""}`}
                  onClick={() => selectAnswer(question.id, option.score)}
                  type="button"
                >
                  {String.fromCharCode(65 + index)}. {option.text}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="row" style={{ marginTop: 24 }}>
          {step > 1 ? (
            <button className="btn secondary" onClick={() => goToStep(step - 1)} type="button">
              上一步
            </button>
          ) : (
            <a className="btn secondary" href="/assessment/company">
              修改企业信息
            </a>
          )}

          {step < TOTAL_STEPS ? (
            <button
              className="btn"
              disabled={!pageDone}
              style={{ opacity: pageDone ? 1 : 0.45 }}
              onClick={() => pageDone && goToStep(step + 1)}
              type="button"
            >
              下一题
            </button>
          ) : (
            <button className="btn" disabled={!pageDone || saving} onClick={submit} type="button">
              {saving ? "正在生成报告..." : "提交并查看报告"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
