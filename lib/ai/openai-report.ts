import type { AIReportInput, GeneratedGrowthReport } from "./report-generator";
import { openAIProvider } from "./providers/openai";

export async function generateOpenAIGrowthReport(
  input: AIReportInput
): Promise<GeneratedGrowthReport> {
  return openAIProvider.generateReport(input);
}
