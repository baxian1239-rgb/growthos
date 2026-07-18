import { NextRequest, NextResponse } from "next/server";
import { generateMockGrowthReport, type AIReportInput } from "@/lib/ai/report-generator";
import { normalizeBottlenecks } from "@/lib/ai/bottlenecks";
import { normalizeNinetyDayPath } from "@/lib/ai/ninety-day-path";
import { getAIReportProvider } from "@/lib/ai/providers";

export async function POST(request: NextRequest) {
  let input: AIReportInput;

  try {
    input = (await request.json()) as AIReportInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!input.scores || typeof input.growth_index !== "number" || !input.growth_level) {
    return NextResponse.json(
      { error: "Missing required fields: scores, growth_index, growth_level" },
      { status: 400 }
    );
  }

  const provider = getAIReportProvider();
  const startedAt = Date.now();

  try {
    const report = await provider.generateReport(input);
    report.topBottlenecks = normalizeBottlenecks(report.topBottlenecks, input.bottlenecks);
    report.ninetyDayPath = normalizeNinetyDayPath(report.ninetyDayPath);
    const durationMs = Date.now() - startedAt;

    console.info("[ai-report] generated", {
      provider: provider.name,
      model: provider.model,
      durationMs,
    });

    return NextResponse.json({
      report,
      meta: {
        provider: provider.name,
        model: provider.model,
        durationMs,
        fallback: false,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate AI report";
    const durationMs = Date.now() - startedAt;
    const report = generateMockGrowthReport(input);
    report.topBottlenecks = normalizeBottlenecks(report.topBottlenecks, input.bottlenecks);
    report.ninetyDayPath = normalizeNinetyDayPath(report.ninetyDayPath);

    console.error("[ai-report] fallback", {
      provider: provider.name,
      model: provider.model,
      durationMs,
      error: message,
    });

    return NextResponse.json({
      report,
      meta: {
        provider: provider.name,
        model: provider.model,
        durationMs,
        fallback: true,
        error: message,
      },
    });
  }
}
