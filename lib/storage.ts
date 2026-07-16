import { AssessmentReport, AssessmentState, EnterpriseInfo, OptionValue } from "@/types";

const STORAGE_KEY = "growthos_assessment";
const REPORT_KEY = "growthos_report";

const defaultState: AssessmentState = {
  enterprise: null,
  answers: {},
  currentStep: 0,
  startedAt: null,
};

export function loadAssessmentState(): AssessmentState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return defaultState;
  }
}

export function saveAssessmentState(state: Partial<AssessmentState>): void {
  if (typeof window === "undefined") return;
  const current = loadAssessmentState();
  const updated = { ...current, ...state };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function saveAnswer(questionId: number, value: OptionValue): void {
  const current = loadAssessmentState();
  saveAssessmentState({
    answers: { ...current.answers, [questionId]: value },
  });
}

export function saveEnterpriseInfo(enterprise: EnterpriseInfo): void {
  saveAssessmentState({ enterprise, startedAt: new Date().toISOString() });
}

export function saveCurrentStep(step: number): void {
  saveAssessmentState({ currentStep: step });
}

export function saveReport(report: AssessmentReport): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REPORT_KEY, JSON.stringify(report));
}

export function loadReport(): AssessmentReport | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REPORT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearAssessment(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(REPORT_KEY);
}
