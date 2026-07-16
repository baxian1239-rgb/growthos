import type { AIReportInput, GeneratedGrowthReport } from "../report-generator";
import { deepSeekProvider } from "./deepseek";
import { openAIProvider } from "./openai";
import { qwenProvider } from "./qwen";
import type { AIProviderName, AIReportProvider } from "./types";

const providers: Record<AIProviderName, AIReportProvider> = {
  openai: openAIProvider,
  deepseek: deepSeekProvider,
  qwen: qwenProvider,
};

function resolveProviderName(): AIProviderName {
  const provider = process.env.AI_PROVIDER?.toLowerCase();

  if (provider === "deepseek" || provider === "qwen" || provider === "openai") {
    return provider;
  }

  return "openai";
}

export function getAIReportProvider(name: AIProviderName = resolveProviderName()) {
  return providers[name];
}

export async function generateProviderGrowthReport(
  input: AIReportInput
): Promise<GeneratedGrowthReport> {
  return getAIReportProvider().generateReport(input);
}

export type { AIProviderName, AIReportProvider };
