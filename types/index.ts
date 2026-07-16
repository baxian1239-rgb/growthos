export type OptionValue = "A" | "B" | "C" | "D" | "E";

export const OPTION_LABELS: Record<OptionValue, string> = {
  A: "基础薄弱",
  B: "初步建立",
  C: "基本成型",
  D: "持续优化",
  E: "系统成熟",
};

export type Option = {
  label: string;
  score: number;
};

export type Question = {
  id: number;
  engine: string;
  title: string;
  options: Option[];
  category?: string;
  text?: string;
};

export type CompanyInfo = {
  name: string;
  phone: string;
  company: string;
  industry: string;
  employees: string;
  revenue: string;
};

export type EnterpriseInfo = {
  companyName: string;
  industry: string;
  employeeCount: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
};

export type AssessmentState = {
  enterprise: EnterpriseInfo | null;
  answers: Record<number, OptionValue>;
  currentStep: number;
  startedAt: string | null;
};

export type AssessmentReport = {
  enterprise: EnterpriseInfo | null;
  answers: Record<number, OptionValue>;
  totalScore: number;
  index: number;
  level: string;
  strengths: string[];
  bottlenecks: string[];
  advice: string[];
  completedAt: string;
};
