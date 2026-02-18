import { z } from "zod";

export const chatRoleSchema = z.enum(["consultant", "client"]);

export const chatMessageSchema = z.object({
  role: chatRoleSchema,
  message: z.string().min(1).max(4000),
});

export const scoreSchema = z.object({
  proactiveness: z.number().min(0).max(100),
  salesIntent: z.number().min(0).max(100),
  empathy: z.number().min(0).max(100),
  clarity: z.number().min(0).max(100),
  urgency: z.number().min(0).max(100),
  toneMatch: z.number().min(0).max(100),
  lengthMatch: z.number().min(0).max(100),
});

export const graderOutputSchema = z.object({
  aiScores: scoreSchema,
  consultantScores: scoreSchema,
  delta: z.number().min(0).max(100),
  diagnosis: z.string().min(1).max(5000),
  recommendedEdits: z.array(z.string().min(1).max(1000)).max(20),
});

export const graderAiOnlyOutputSchema = z.object({
  aiScores: scoreSchema,
  delta: z.number().min(0).max(100),
  diagnosis: z.string().min(1).max(5000),
  recommendedEdits: z.array(z.string().min(1).max(1000)).max(20),
});

export const editorOutputSchema = z.object({
  updatedPrompt: z.string().min(1),
});

export const generateReplyInputSchema = z.object({
  clientSequence: z.string().min(1).max(12000),
  chatHistory: z.array(chatMessageSchema).max(200).default([]),
});

export const improveAiInputSchema = z.object({
  clientSequence: z.string().min(1).max(12000),
  chatHistory: z.array(chatMessageSchema).max(200).default([]),
  consultantReply: z.string().min(1).max(12000),
  maxIterations: z.number().int().min(1).max(10).default(5),
  thresholdDelta: z.number().min(0).max(100).default(20),
  graderEnsembleCount: z.number().int().min(1).max(10).default(5),
  earlyStopPatience: z.number().int().min(1).max(10).default(2),
  includePromptDiff: z.boolean().optional().default(false),
});

export const improveAiManuallyInputSchema = z.object({
  instructions: z.string().min(1).max(12000),
});

export const updateMasterPromptInputSchema = z.object({
  prompt: z.string().min(1).max(50000),
});

export const improveAiIterationLogSchema = z.object({
  iteration: z.number().int().positive(),
  predictedReply: z.string(),
  avgAiScores: scoreSchema,
  avgConsultantScores: scoreSchema,
  avgDelta: z.number(),
  diagnosis: z.string(),
  recommendedEdits: z.array(z.string()),
  promptBefore: z.string(),
  promptAfter: z.string(),
});

export const streamEventNameSchema = z.enum([
  "start",
  "iteration",
  "converged",
  "done",
  "error",
]);

export const improveAiStreamStartSchema = z.object({
  runId: z.string(),
  maxIterations: z.number().int(),
  thresholdDelta: z.number(),
  graderEnsembleCount: z.number().int(),
  consultantReply: z.string(),
  responderUserPrompt: z.string(),
});

export const improveAiStreamIterationSchema = z.object({
  runId: z.string(),
  iteration: z.number().int(),
  predictedReply: z.string(),
  avgAiScores: scoreSchema,
  avgConsultantScores: scoreSchema,
  avgDelta: z.number(),
  bestDeltaSoFar: z.number(),
  diagnosis: z.string(),
  recommendedEdits: z.array(z.string()),
  promptBeforeHash: z.string(),
  promptAfterHash: z.string(),
  promptBeforePreview: z.string().optional(),
  promptAfterPreview: z.string().optional(),
});

export const improveAiStreamConvergedSchema = z.object({
  runId: z.string(),
  iteration: z.number().int(),
  bestDelta: z.number(),
});

export const improveAiStreamDoneSchema = z.object({
  runId: z.string(),
  iterations: z.number().int(),
  bestDelta: z.number(),
  updatedPromptStoredAt: z.string(),
});

export const improveAiStreamErrorSchema = z.object({
  runId: z.string(),
  message: z.string(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type Scores = z.infer<typeof scoreSchema>;
export type GraderOutput = z.infer<typeof graderOutputSchema>;
export type GraderAiOnlyOutput = z.infer<typeof graderAiOnlyOutputSchema>;
export type EditorOutput = z.infer<typeof editorOutputSchema>;
export type GenerateReplyInput = z.infer<typeof generateReplyInputSchema>;
export type ImproveAiInput = z.infer<typeof improveAiInputSchema>;
export type ImproveAiManuallyInput = z.infer<
  typeof improveAiManuallyInputSchema
>;
export type ImproveAiIterationLog = z.infer<typeof improveAiIterationLogSchema>;
