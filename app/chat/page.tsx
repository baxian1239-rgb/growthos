"use client";

import { FormEvent, useEffect, useState } from "react";
import type { GeneratedGrowthReport } from "@/lib/ai/report-generator";
import { normalizeAIChatReply, type AIChatContext, type AIChatMessage } from "@/lib/ai/providers/types";
import "./chat.css";

function renderMessage(content: string) {
  try {
    const reply = normalizeAIChatReply(JSON.parse(content));
    const phases = [
      { label: "第一阶段｜1-30天", goal: "解决当前最大增长瓶颈。", stages: reply.ninetyDayPlan.days1_30 },
      { label: "第二阶段｜31-60天", goal: "提升企业核心增长能力。", stages: reply.ninetyDayPlan.days31_60 },
      { label: "第三阶段｜61-90天", goal: "形成可复制增长体系。", stages: reply.ninetyDayPlan.days61_90 },
    ];
    return <div className="chat-report"><section><h3>优先解决问题</h3><p>{reply.priorityProblem}</p></section><section><h3>为什么</h3><p>{reply.reason}</p></section><section><h3>影响</h3><p>{reply.impact}</p></section><section className="ninety-day-plan"><h2>90天增长行动计划</h2><div className="plan-grid">{phases.map((phase) => <article className="plan-card" key={phase.label}><span className="phase-label">{phase.label}</span>{phase.stages.map((stage, stageIndex) => <div key={`${phase.label}-${stageIndex}`}><h3>{stage.title}</h3><p className="plan-goal"><strong>目标：</strong>{phase.goal}</p><div className="plan-actions"><strong>行动：</strong>{stage.actions.map((action, actionIndex) => <p key={`${action}-${actionIndex}`}>✓ {action}</p>)}</div></div>)}</article>)}</div></section></div>;
  } catch { return content; }
}

export default function ChatPage() {
  const [context, setContext] = useState<AIChatContext | null>(null);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { try { const result = JSON.parse(localStorage.getItem("growthos-result") || "null"); if (!result) return; const report = JSON.parse(localStorage.getItem("growthos-ai-report") || "null") as GeneratedGrowthReport | null; const nextContext: AIChatContext = { companyInfo: { company: result.company, industry: result.industry, employees: result.employees, revenue: result.revenue }, answers: result.answers || {}, scores: result.engines || {}, growthIndex: result.index || 0, growthLevel: result.level || "", report }; setContext(nextContext); setMessages([{ role: "assistant", content: `我已加载你的测评数据。当前增长指数为 ${nextContext.growthIndex}，可以继续问我增长瓶颈、能力提升或90天行动计划。` }]); } catch { setContext(null); } }, []);

  async function send(event: FormEvent) { event.preventDefault(); const content = input.trim(); if (!content || !context || loading) return; const nextMessages = [...messages, { role: "user" as const, content }]; setMessages(nextMessages); setInput(""); setLoading(true); try { const response = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ context, messages: nextMessages }) }); const data = (await response.json()) as { reply?: unknown; error?: string }; if (!response.ok) throw new Error(data.error || "AI暂时无法回答"); const reply = typeof data.reply === "string" ? data.reply : JSON.stringify(data.reply); setMessages([...nextMessages, { role: "assistant", content: reply || "暂时没有生成回答。" }]); } catch (error) { setMessages([...nextMessages, { role: "assistant", content: error instanceof Error ? error.message : "AI顾问暂时无法回答，请稍后再试。" }]); } finally { setLoading(false); } }

  if (!context) return <main className="container section"><div className="card report-empty"><h1>请先完成测评</h1><p className="muted">加载测评数据后，AI增长顾问才能给出针对性建议。</p><a className="btn" href="/assessment/company">开始测评</a></div></main>;
  return <main className="container section"><div className="chat-shell"><div className="section-heading"><span className="eyebrow">AI增长顾问</span><h1>继续拆解你的增长问题</h1><p className="muted">顾问会基于你的企业信息、28题答案、七大能力评分、增长指数和AI报告回答。</p></div><div className="card chat-card"><div className="chat-messages">{messages.map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>{message.role === "assistant" ? renderMessage(message.content) : message.content}</div>)}</div><form className="chat-form" onSubmit={send}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="例如：我最应该先解决哪个增长瓶颈？" disabled={loading} /><button className="btn" disabled={loading || !input.trim()}>{loading ? "思考中…" : "发送"}</button></form></div></div></main>;
}
