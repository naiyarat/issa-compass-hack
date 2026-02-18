import { createHash, randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import type { db as dbType } from "@/server/db";
import type {
  ChatMessage,
  EditorOutput,
  GraderAiOnlyOutput,
  GraderOutput,
  ImproveAiInput,
  ImproveAiIterationLog,
  Scores,
} from "@/server/api/dto/ai-prompt.dto";
import {
  editorOutputSchema,
  graderAiOnlyOutputSchema,
  graderOutputSchema,
} from "@/server/api/dto/ai-prompt.dto";
import { llmClient } from "@/server/ai/llm-client";
import {
  DEFAULT_EDITOR_PROMPT,
  DEFAULT_GRADER_AI_ONLY_PROMPT,
  DEFAULT_GRADER_PROMPT,
  DEFAULT_MASTER_PROMPT,
} from "@/server/ai/prompts";
import { masterPrompt, promptRun } from "@/server/db/schema";

type DbLike = typeof dbType;

export type ImproveAiIterationEvent = {
  runId: string;
  iteration: number;
  predictedReply: string;
  avgAiScores: Scores;
  avgConsultantScores: Scores;
  avgDelta: number;
  bestDeltaSoFar: number;
  diagnosis: string;
  recommendedEdits: string[];
  promptBeforeHash: string;
  promptAfterHash: string;
  promptBeforePreview?: string;
  promptAfterPreview?: string;
};

export type ImproveAiRunResult = {
  runId: string;
  predictedReply: string;
  updatedPrompt: string;
  bestDelta: number;
  iterations: number;
  runLog: ImproveAiIterationLog[];
  convergedIteration?: number;
  updatedPromptStoredAt: string;
};

type ImproveAiRunOptions = {
  db: DbLike;
  input: ImproveAiInput;
  signal?: AbortSignal;
  runId?: string;
  onIteration?: (event: ImproveAiIterationEvent) => void;
};

function abortIfNeeded(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new Error("REQUEST_ABORTED");
  }
}

function chatHistoryToText(chatHistory: ChatMessage[]): string {
  if (chatHistory.length === 0) return "(empty)";
  return chatHistory.map((m) => `${m.role}: ${m.message}`).join("\n");
}

function getPromptHash(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex");
}

function averageScores(items: Scores[]): Scores {
  const div = items.length;
  const sum = items.reduce(
    (acc, score) => ({
      proactiveness: acc.proactiveness + score.proactiveness,
      salesIntent: acc.salesIntent + score.salesIntent,
      empathy: acc.empathy + score.empathy,
      clarity: acc.clarity + score.clarity,
      urgency: acc.urgency + score.urgency,
      toneMatch: acc.toneMatch + score.toneMatch,
      lengthMatch: acc.lengthMatch + score.lengthMatch,
    }),
    {
      proactiveness: 0,
      salesIntent: 0,
      empathy: 0,
      clarity: 0,
      urgency: 0,
      toneMatch: 0,
      lengthMatch: 0,
    },
  );

  return {
    proactiveness: sum.proactiveness / div,
    salesIntent: sum.salesIntent / div,
    empathy: sum.empathy / div,
    clarity: sum.clarity / div,
    urgency: sum.urgency / div,
    toneMatch: sum.toneMatch / div,
    lengthMatch: sum.lengthMatch / div,
  };
}

type GraderLike = { recommendedEdits: string[]; diagnosis: string };

function mergeRecommendedEdits(graders: GraderLike[]): string[] {
  const unique = new Set<string>();
  for (const output of graders) {
    for (const edit of output.recommendedEdits) {
      unique.add(edit.trim());
    }
  }
  return [...unique].filter((x) => x.length > 0).slice(0, 20);
}

function mergeDiagnoses(graders: GraderLike[]): string {
  return graders
    .map((g) => g.diagnosis.trim())
    .filter(Boolean)
    .join(" | ");
}

async function getOrCreateMasterPrompt(db: DbLike): Promise<{
  prompt: string;
  updatedAt: Date;
}> {
  const existing = await db.query.masterPrompt.findFirst({
    where: (table, { eq }) => eq(table.id, 1),
  });

  if (existing) {
    return { prompt: existing.prompt, updatedAt: existing.updatedAt };
  }

  const now = new Date();
  await db.insert(masterPrompt).values({
    id: 1,
    prompt: DEFAULT_MASTER_PROMPT,
    createdAt: now,
    updatedAt: now,
  });

  return { prompt: DEFAULT_MASTER_PROMPT, updatedAt: now };
}

export async function getMasterPromptState({
  db,
}: {
  db: DbLike;
}): Promise<{ prompt: string; updatedAt: string }> {
  const state = await getOrCreateMasterPrompt(db);
  return {
    prompt: state.prompt,
    updatedAt: state.updatedAt.toISOString(),
  };
}

export async function generateReplyFromMasterPrompt({
  db,
  clientSequence,
  chatHistory,
  signal,
}: {
  db: DbLike;
  clientSequence: string;
  chatHistory: ChatMessage[];
  signal?: AbortSignal;
}): Promise<{ aiReply: string; promptVersionUpdatedAt: string }> {
  abortIfNeeded(signal);
  const { prompt, updatedAt } = await getOrCreateMasterPrompt(db);

  const aiReply = await llmClient.generateText({
    role: "responder",
    systemPrompt: prompt,
    userPrompt: `Client sequence:\n${clientSequence}\n\nChat history:\n${chatHistoryToText(chatHistory)}`,
    temperature: 0.4,
  });

  return { aiReply, promptVersionUpdatedAt: updatedAt.toISOString() };
}

export async function improveAiRun({
  db,
  input,
  signal,
  runId: providedRunId,
  onIteration,
}: ImproveAiRunOptions): Promise<ImproveAiRunResult> {
  const runId = providedRunId ?? randomUUID();
  const graderEnsembleCount = input.graderEnsembleCount;

  const { prompt: currentStoredPrompt } = await getOrCreateMasterPrompt(db);
  let currentPrompt = currentStoredPrompt;
  let bestPrompt = currentPrompt;
  let bestDelta = Number.POSITIVE_INFINITY;
  let noImprovementCount = 0;
  let convergedIteration: number | undefined;
  let lastPredictedReply = "";
  const runLog: ImproveAiIterationLog[] = [];
  let runConsultantScores: Scores | null = null;

  for (let iteration = 1; iteration <= input.maxIterations; iteration++) {
    abortIfNeeded(signal);

    const promptBefore = currentPrompt;
    const predictedReply = await llmClient.generateText({
      role: "responder",
      systemPrompt: currentPrompt,
      userPrompt: `Client sequence:\n${input.clientSequence}\n\nChat history:\n${chatHistoryToText(input.chatHistory)}`,
      temperature: 0.4,
    });
    lastPredictedReply = predictedReply;

    let avgAiScores: Scores;
    let avgConsultantScores: Scores;
    let avgDelta: number;
    let graderResultsForMerge: GraderLike[];

    if (iteration === 1) {
      const graderResults: GraderOutput[] = [];
      for (let i = 0; i < graderEnsembleCount; i++) {
        abortIfNeeded(signal);
        const graderRaw = await llmClient.generateJsonStrict<GraderOutput>({
          role: "grader",
          systemPrompt: DEFAULT_GRADER_PROMPT,
          userPrompt: JSON.stringify(
            {
              clientSequence: input.clientSequence,
              chatHistory: input.chatHistory,
              predictedReply,
              consultantReply: input.consultantReply,
            },
            null,
            2,
          ),
        });
        graderResults.push(graderOutputSchema.parse(graderRaw));
      }
      avgAiScores = averageScores(graderResults.map((g) => g.aiScores));
      avgConsultantScores = averageScores(
        graderResults.map((g) => g.consultantScores),
      );
      runConsultantScores = avgConsultantScores;
      avgDelta =
        graderResults.reduce((acc, g) => acc + g.delta, 0) /
        graderResults.length;
      graderResultsForMerge = graderResults;
    } else {
      const consultantScores = runConsultantScores!;
      const graderResults: GraderAiOnlyOutput[] = [];
      for (let i = 0; i < graderEnsembleCount; i++) {
        abortIfNeeded(signal);
        const graderRaw =
          await llmClient.generateJsonStrict<GraderAiOnlyOutput>({
            role: "grader",
            systemPrompt: DEFAULT_GRADER_AI_ONLY_PROMPT,
            userPrompt: JSON.stringify(
              {
                clientSequence: input.clientSequence,
                chatHistory: input.chatHistory,
                predictedReply,
                consultantReply: input.consultantReply,
                consultantScores,
              },
              null,
              2,
            ),
          });
        graderResults.push(graderAiOnlyOutputSchema.parse(graderRaw));
      }
      avgAiScores = averageScores(graderResults.map((g) => g.aiScores));
      avgConsultantScores = consultantScores;
      avgDelta =
        graderResults.reduce((acc, g) => acc + g.delta, 0) /
        graderResults.length;
      graderResultsForMerge = graderResults;
    }

    const diagnosis = mergeDiagnoses(graderResultsForMerge);
    const recommendedEdits = mergeRecommendedEdits(graderResultsForMerge);

    if (avgDelta < bestDelta) {
      bestDelta = avgDelta;
      bestPrompt = currentPrompt;
      noImprovementCount = 0;
    } else {
      noImprovementCount += 1;
    }

    let promptAfter = currentPrompt;
    if (avgDelta <= input.thresholdDelta) {
      convergedIteration = iteration;
    } else if (noImprovementCount >= input.earlyStopPatience) {
      // Stop without additional edit if loop is not improving.
    } else {
      const editorRaw = await llmClient.generateJsonStrict<EditorOutput>({
        role: "editor",
        systemPrompt: DEFAULT_EDITOR_PROMPT,
        userPrompt: JSON.stringify(
          {
            currentMasterPrompt: currentPrompt,
            graderOutput: {
              aiScores: avgAiScores,
              consultantScores: avgConsultantScores,
              delta: avgDelta,
              diagnosis,
              recommendedEdits,
            },
          },
          null,
          2,
        ),
      });

      const editorParsed = editorOutputSchema.parse(editorRaw);
      const nextPrompt = editorParsed.updatedPrompt.trim();
      if (!nextPrompt) throw new Error("INVALID_UPDATED_PROMPT");
      if (nextPrompt.length > currentPrompt.length * 3 + 4000) {
        throw new Error("UPDATED_PROMPT_TOO_LARGE");
      }

      promptAfter = nextPrompt;
      currentPrompt = nextPrompt;
    }

    runLog.push({
      iteration,
      predictedReply,
      avgAiScores,
      avgConsultantScores,
      avgDelta,
      diagnosis,
      recommendedEdits,
      promptBefore,
      promptAfter,
    });

    onIteration?.({
      runId,
      iteration,
      predictedReply,
      avgAiScores,
      avgConsultantScores,
      avgDelta,
      bestDeltaSoFar: bestDelta,
      diagnosis,
      recommendedEdits,
      promptBeforeHash: getPromptHash(promptBefore),
      promptAfterHash: getPromptHash(promptAfter),
      promptBeforePreview: input.includePromptDiff ? promptBefore : undefined,
      promptAfterPreview: input.includePromptDiff ? promptAfter : undefined,
    });

    if (avgDelta <= input.thresholdDelta) break;
    if (noImprovementCount >= input.earlyStopPatience) break;
  }

  const now = new Date();
  await db
    .update(masterPrompt)
    .set({ prompt: bestPrompt, updatedAt: now })
    .where(and(eq(masterPrompt.id, 1)));

  await db.insert(promptRun).values({
    inputClientSequence: input.clientSequence,
    inputChatHistoryJson: input.chatHistory,
    consultantReply: input.consultantReply,
    iterations: runLog.length,
    bestDelta,
    bestPrompt,
    runLogJson: runLog,
  });

  return {
    runId,
    predictedReply: lastPredictedReply,
    updatedPrompt: bestPrompt,
    bestDelta,
    iterations: runLog.length,
    runLog,
    convergedIteration,
    updatedPromptStoredAt: now.toISOString(),
  };
}

export async function improvePromptManually({
  db,
  instructions,
  signal,
}: {
  db: DbLike;
  instructions: string;
  signal?: AbortSignal;
}): Promise<{ updatedPrompt: string }> {
  abortIfNeeded(signal);
  const { prompt: currentPrompt } = await getOrCreateMasterPrompt(db);

  const editorRaw = await llmClient.generateJsonStrict<EditorOutput>({
    role: "editor",
    systemPrompt: DEFAULT_EDITOR_PROMPT,
    userPrompt: JSON.stringify(
      {
        currentMasterPrompt: currentPrompt,
        instructions,
      },
      null,
      2,
    ),
  });

  const parsed = editorOutputSchema.parse(editorRaw);
  const updatedPrompt = parsed.updatedPrompt.trim();
  if (!updatedPrompt) throw new Error("INVALID_UPDATED_PROMPT");
  if (updatedPrompt.length > currentPrompt.length * 3 + 4000) {
    throw new Error("UPDATED_PROMPT_TOO_LARGE");
  }

  await db
    .update(masterPrompt)
    .set({ prompt: updatedPrompt, updatedAt: new Date() })
    .where(and(eq(masterPrompt.id, 1)));

  return { updatedPrompt };
}

export async function updateMasterPrompt({
  db,
  prompt,
}: {
  db: DbLike;
  prompt: string;
}): Promise<{ updatedAt: string }> {
  const trimmed = prompt.trim();
  if (!trimmed) throw new Error("INVALID_UPDATED_PROMPT");

  await getOrCreateMasterPrompt(db);
  const now = new Date();
  await db
    .update(masterPrompt)
    .set({ prompt: trimmed, updatedAt: now })
    .where(and(eq(masterPrompt.id, 1)));

  return { updatedAt: now.toISOString() };
}
