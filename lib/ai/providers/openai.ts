import type { AIReportInput, GeneratedGrowthReport } from "../report-generator";
import type { AIChatContext, AIChatMessage, AIChatReply, AIReportProvider } from "./types";

const DEFAULT_MODEL = "gpt-4.1-mini";

const reportJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    growthIndexAnalysis: {
      type: "object",
      additionalProperties: false,
      properties: {
        growth_index: { type: "number" },
        growth_level: { type: "string" },
        summary: { type: "string" },
      },
      required: ["growth_index", "growth_level", "summary"],
    },
    currentGrowthState: { type: "string" },
    capabilityAnalysis: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          score: { type: "number" },
          interpretation: { type: "string" },
        },
        required: ["name", "score", "interpretation"],
      },
    },
    topBottlenecks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          problem: { type: "string" },
          impact: { type: "string" },
          suggestion: { type: "string" },
        },
        required: ["name", "problem", "impact", "suggestion"],
      },
    },
    ninetyDayPath: {
      type: "object",
      additionalProperties: false,
      properties: {
        days0To30: { type: "array", items: { type: "string" } },
        days30To60: { type: "array", items: { type: "string" } },
        days60To90: { type: "array", items: { type: "string" } },
      },
      required: ["days0To30", "days30To60", "days60To90"],
    },
    aiGrowthAdvice: { type: "array", items: { type: "string" } },
  },
  required: [
    "growthIndexAnalysis",
    "currentGrowthState",
    "capabilityAnalysis",
    "topBottlenecks",
    "ninetyDayPath",
    "aiGrowthAdvice",
  ],
};

function buildPrompt(input: AIReportInput) {
  return [
    "你是一名资深企业增长咨询顾问，正在为企业老板生成《企业10倍增长评测》诊断报告。",
    "请使用专业、直接、可执行的中文咨询报告语气，不要写营销废话。",
    "报告必须围绕企业当前阶段、七大能力评分、增长瓶颈和未来90天行动计划展开。",
    "三大增长瓶颈必须各包含：问题描述、影响分析、优化建议。",
    "90天行动路径必须分为：0-30天、30-60天、60-90天。",
    "",
    "输入数据如下：",
    JSON.stringify(input, null, 2),
  ].join("\n");
}

function extractResponseText(data: unknown) {
  const response = data as {
    output_text?: string;
    output?: Array<{
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  if (response.output_text) return response.output_text;

  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .filter((content) => content.type === "output_text")
      .map((content) => content.text)
      .filter(Boolean)
      .join("\n") ?? ""
  );
}

async function generateReport(input: AIReportInput): Promise<GeneratedGrowthReport> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      input: buildPrompt(input),
      temperature: 0.4,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "growth_diagnosis_report",
          strict: true,
          schema: reportJsonSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${message}`);
  }

  const data = await response.json();
  const text = extractResponseText(data);

  if (!text) {
    throw new Error("OpenAI API returned an empty report");
  }

  return JSON.parse(text) as GeneratedGrowthReport;
}

async function generateChatReply(context: AIChatContext, messages: AIChatMessage[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  console.info("[ai-chat] request", { provider: "openai", model, messageCount: messages.length });
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      instructions: "你是AI增长顾问。只能基于用户提供的企业测评数据和报告回答，先引用数据事实，再给出具体可执行建议；不确定的信息要明确说明。使用简洁、专业的中文。\n用户测评数据：" + JSON.stringify(context),
      input: messages.map((message) => `${message.role === "assistant" ? "AI增长顾问" : "用户"}：${message.content}`).join("\n\n") + "\n\n请只返回合法JSON，不要Markdown。必须包含 priorityProblem、reason、impact、ninetyDayPlan。ninetyDayPlan必须包含days1_30、days31_60、days61_90；每个阶段是由title和actions组成的对象数组，actions不能为空。",
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    const errorData = data as { error?: { message?: string; code?: string } };
    const error = new Error(`OpenAI API error ${response.status}: ${errorData.error?.message || "Unknown error"}`) as Error & { code?: string };
    error.code = errorData.error?.code;
    console.error("[ai-chat] provider error", { provider: "openai", model, error: error.message, code: error.code });
    throw error;
  }
  const text = extractResponseText(data);
  if (!text) throw new Error("OpenAI API returned an empty chat reply");
  console.info("[ai-chat] response", { provider: "openai", model, outputLength: text.length });
  return JSON.parse(text) as AIChatReply;
}

export const openAIProvider: AIReportProvider = {
  name: "openai",
  model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
  generateReport,
  generateChatReply,
};
