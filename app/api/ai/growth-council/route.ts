import { NextRequest, NextResponse } from "next/server";
import { generateGrowthCouncilReport } from "@/lib/ai/growth-council";
import { externalSkillIntegrations } from "@/lib/ai/skill-integrations";
import type { AIReportInput } from "@/lib/ai/report-generator";

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

  const report = generateGrowthCouncilReport(input);

  return NextResponse.json({
    report,
    integrations: externalSkillIntegrations,
    meta: {
      provider: "growthos-local",
      model: "growth-council-v1",
      fallback: false,
    },
  });
}
