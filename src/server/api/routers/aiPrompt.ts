import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";

import type { ChatMessage } from "@/server/api/dto/ai-prompt.dto";
import {
  generateReplyInputSchema,
  improveAiInputSchema,
  improveAiManuallyInputSchema,
  updateMasterPromptInputSchema,
} from "@/server/api/dto/ai-prompt.dto";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import {
  generateReplyFromMasterPrompt,
  getMasterPromptState,
  improveAiRun,
  improvePromptManually,
  updateMasterPrompt,
} from "@/server/ai/improve-ai.service";
import { createAsyncEventQueue } from "@/server/ai/stream-events";

function toSafeErrorMessage(error: unknown): string {
  console.error(error);

  if (error instanceof Error) {
    switch (error.message) {
      case "REQUEST_ABORTED":
        return "Request was aborted.";
      case "INVALID_UPDATED_PROMPT":
        return "Prompt editor returned an invalid prompt.";
      case "UPDATED_PROMPT_TOO_LARGE":
        return "Prompt editor update exceeded guardrails.";
      case "INVALID_JSON_RESPONSE":
        return "Model returned invalid JSON.";
      case "LLM_PROVIDER_REQUEST_FAILED":
        return "Model provider request failed.";
      case "LLM_PROVIDER_QUOTA_EXCEEDED":
        return "Model quota exceeded. Please wait or add provider credits.";
      case "DEEPSEEK_INSUFFICIENT_BALANCE":
        return "DeepSeek balance is insufficient. Please top up credits.";
      case "EMPTY_LLM_RESPONSE":
        return "Model returned an empty response.";
      default:
        return "Internal processing error.";
    }
  }
  return "Internal processing error.";
}

function buildResponderUserPrompt(
  clientSequence: string,
  chatHistory: ChatMessage[],
): string {
  const historyText =
    chatHistory.length === 0
      ? "(empty)"
      : chatHistory.map((m) => `${m.role}: ${m.message}`).join("\n");
  return `Client sequence:\n${clientSequence}\n\nChat history:\n${historyText}`;
}

export const aiPromptRouter = createTRPCRouter({
  getMasterPrompt: publicProcedure.query(async ({ ctx }) => {
    try {
      return await getMasterPromptState({ db: ctx.db });
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: toSafeErrorMessage(error),
      });
    }
  }),

  generateReply: publicProcedure
    .input(generateReplyInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await generateReplyFromMasterPrompt({
          db: ctx.db,
          clientSequence: input.clientSequence,
          chatHistory: input.chatHistory,
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: toSafeErrorMessage(error),
        });
      }
    }),

  improveAi: publicProcedure
    .input(improveAiInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await improveAiRun({
          db: ctx.db,
          input,
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: toSafeErrorMessage(error),
        });
      }
    }),

  improveAiStream: publicProcedure
    .input(improveAiInputSchema)
    .query(async (opts) => {
      const { input, ctx } = opts;
      const queue = createAsyncEventQueue<
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
              avgAiScores: {
                proactiveness: number;
                salesIntent: number;
                empathy: number;
                clarity: number;
                urgency: number;
                toneMatch: number;
                lengthMatch: number;
              };
              avgConsultantScores: {
                proactiveness: number;
                salesIntent: number;
                empathy: number;
                clarity: number;
                urgency: number;
                toneMatch: number;
                lengthMatch: number;
              };
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
        | {
            event: "error";
            data: { runId: string; message: string };
          }
      >();

      void (async () => {
        const runId = randomUUID();
        try {
          queue.push({
            event: "start",
            data: {
              runId,
              maxIterations: input.maxIterations,
              thresholdDelta: input.thresholdDelta,
              graderEnsembleCount: input.graderEnsembleCount,
              consultantReply: input.consultantReply,
              responderUserPrompt: buildResponderUserPrompt(
                input.clientSequence,
                input.chatHistory,
              ),
            },
          });

          const resultPromise = improveAiRun({
            db: ctx.db,
            input,
            runId,
            signal: (opts as { signal?: AbortSignal }).signal,
            onIteration: (event) => {
              queue.push({ event: "iteration", data: event });
            },
          });

          const result = await resultPromise;

          if (result.convergedIteration) {
            queue.push({
              event: "converged",
              data: {
                runId,
                iteration: result.convergedIteration,
                bestDelta: result.bestDelta,
              },
            });
          }

          queue.push({
            event: "done",
            data: {
              runId,
              iterations: result.iterations,
              bestDelta: result.bestDelta,
              updatedPromptStoredAt: result.updatedPromptStoredAt,
            },
          });
        } catch (error) {
          queue.push({
            event: "error",
            data: {
              runId,
              message: toSafeErrorMessage(error),
            },
          });
        } finally {
          queue.close();
        }
      })();

      return queue.iterable;
    }),

  improveAiManually: publicProcedure
    .input(improveAiManuallyInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await improvePromptManually({
          db: ctx.db,
          instructions: input.instructions,
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: toSafeErrorMessage(error),
        });
      }
    }),

  updateMasterPrompt: publicProcedure
    .input(updateMasterPromptInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateMasterPrompt({
          db: ctx.db,
          prompt: input.prompt,
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: toSafeErrorMessage(error),
        });
      }
    }),
});
