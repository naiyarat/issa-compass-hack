export type ScoresShape = {
  proactiveness: number;
  salesIntent: number;
  empathy: number;
  clarity: number;
  urgency: number;
  toneMatch: number;
  lengthMatch: number;
};

export type StreamEvent =
  | {
      event: "start";
      data: {
        runId: string;
        maxIterations: number;
        thresholdDelta: number;
        graderEnsembleCount: number;
        consultantReply: string;
        responderUserPrompt: string;
      };
    }
  | {
      event: "iteration";
      data: {
        runId: string;
        iteration: number;
        predictedReply: string;
        avgAiScores: ScoresShape;
        avgConsultantScores: ScoresShape;
        avgDelta: number;
        bestDeltaSoFar: number;
        diagnosis: string;
        recommendedEdits: string[];
        promptBeforeHash: string;
        promptAfterHash: string;
        promptBeforePreview?: string;
        promptAfterPreview?: string;
      };
    }
  | {
      event: "converged";
      data: { runId: string; iteration: number; bestDelta: number };
    }
  | {
      event: "done";
      data: {
        runId: string;
        iterations: number;
        bestDelta: number;
        updatedPromptStoredAt: string;
      };
    }
  | { event: "error"; data: { runId: string; message: string } };

export const DIMENSION_LABELS = [
  ["Proactiveness", "proactiveness"],
  ["Sales Intent", "salesIntent"],
  ["Empathy", "empathy"],
  ["Clarity", "clarity"],
  ["Urgency", "urgency"],
  ["Tone", "toneMatch"],
  ["Length", "lengthMatch"],
] as const;

export function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function scoreEntries(scores: ScoresShape) {
  return DIMENSION_LABELS.map(([label, key]) => [label, scores[key]]) as [
    string,
    number,
  ][];
}
