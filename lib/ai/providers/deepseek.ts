import type { AIReportInput, GeneratedGrowthReport } from "../report-generator";
import type { AIChatContext, AIChatMessage, AIChatReply, AIReportProvider } from "./types";

const DEFAULT_MODEL = "deepseek-chat";
const ENDPOINT = "https://api.deepseek.com/chat/completions";

function requireKey() {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY is not configured");
  return key;
}

async function callDeepSeek(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>, responseFormat?: object) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${requireKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.DEEPSEEK_MODEL || DEFAULT_MODEL, messages, temperature: 0.4, ...(responseFormat ? { response_format: responseFormat } : {}) }),
  });
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string; code?: string } };
  if (!response.ok) throw new Error(`DeepSeek API error ${response.status} [${data.error?.code || "unknown"}]: ${data.error?.message || "Unknown error"}`);
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek API returned an empty response");
  return content;
}

async function generateReport(input: AIReportInput): Promise<GeneratedGrowthReport> {
  const content = await callDeepSeek([
    { role: "system", content: "请严格返回 JSON 格式，不要返回 Markdown。" },
    { role: "system", content: "你是企业增长顾问。请严格基于输入测评数据，用中文生成企业增长诊断报告。只返回合法JSON，不要Markdown代码块。JSON必须包含 growthIndexAnalysis、currentGrowthState、capabilityAnalysis、topBottlenecks、ninetyDayPath、aiGrowthAdvice，结构与字段含义以报告页面为准。" },
    { role: "user", content: JSON.stringify(input) },
  ], { type: "json_object" });
  return JSON.parse(content) as GeneratedGrowthReport;
}

async function generateChatReply(context: AIChatContext, messages: AIChatMessage[]) {
  const content = await callDeepSeek([
    { role: "system", content: "请严格返回 JSON 格式，不要返回 Markdown。" },
    { role: "system", content: `你是AI增长顾问。只能基于用户测评数据回答，先引用数据事实，再给出具体可执行建议。使用简洁专业的中文。返回JSON必须包含 priorityProblem、reason、impact、ninetyDayPlan。ninetyDayPlan必须包含days1_30、days31_60、days61_90；每个字段必须是数组，数组对象必须包含title和非空actions字符串数组。三个阶段分别聚焦基础修复、能力提升和系统建设。测评数据：${JSON.stringify(context)}` },
    ...messages,
  ], { type: "json_object" });
  return JSON.parse(content) as AIChatReply;
}

export const deepSeekProvider: AIReportProvider = {
  name: "deepseek",
  model: process.env.DEEPSEEK_MODEL || DEFAULT_MODEL,
  generateReport,
  generateChatReply,
};
