import { NextRequest, NextResponse } from "next/server";
import { getAIReportProvider } from "@/lib/ai/providers";
import { normalizeAIChatReply, type AIChatContext, type AIChatMessage } from "@/lib/ai/providers/types";

export async function POST(request: NextRequest) {
  const provider = getAIReportProvider();
  try {
    const body = (await request.json()) as { context?: AIChatContext; messages?: AIChatMessage[] };
    if (!body.context || !body.messages?.length) {
      return NextResponse.json({ error: "Missing chat context or messages" }, { status: 400 });
    }
    const reply = normalizeAIChatReply(await provider.generateChatReply(body.context, body.messages));
    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate chat reply";
    const code = error && typeof error === "object" && "code" in error ? String(error.code || "") : "";
    console.error("[ai-chat] route error", { provider: provider.name, model: provider.model, error: message, code });
    return NextResponse.json({ error: message, code }, { status: 500 });
  }
}
