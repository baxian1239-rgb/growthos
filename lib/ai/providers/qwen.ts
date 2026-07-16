import type { AIReportProvider } from "./types";

export const qwenProvider: AIReportProvider = {
  name: "qwen",
  model: process.env.QWEN_MODEL || "qwen-plus",
  async generateReport() {
    throw new Error("Qwen provider is not implemented yet");
  },
  async generateChatReply() {
    throw new Error("Qwen provider is not implemented yet");
  },
};
