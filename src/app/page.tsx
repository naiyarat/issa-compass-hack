"use client";

import {
  createTRPCClient,
  httpBatchStreamLink,
  loggerLink,
} from "@trpc/client";
import { useEffect, useMemo, useRef, useState } from "react";
import SuperJSON from "superjson";

import {
  AutoImproveSection,
  GenerateReplySection,
  ManualImproveSection,
  MasterPromptSection,
} from "@/app/_components";
import {
  type GenerateReplyPreset,
  type ImproveAiPreset,
  generateReplyPresets,
  improveAiPresets,
} from "@/app/_data/conversation-request-options";
import type { StreamEvent } from "@/app/_types";
import { getBaseUrl } from "@/app/_types";
import { type AppRouter } from "@/server/api/root";
import { api } from "@/trpc/react";

export default function Home() {
  const [generatePresetId, setGeneratePresetId] = useState(
    generateReplyPresets[0]?.id ?? "",
  );
  const [improvePresetId, setImprovePresetId] = useState(
    improveAiPresets[0]?.id ?? "",
  );
  const [graderEnsembleCount, setGraderEnsembleCount] = useState("1");
  const [maxIterations, setMaxIterations] = useState("5");
  const [thresholdDelta, setThresholdDelta] = useState("20");
  const [manualInstructions, setManualInstructions] = useState("");
  const [manualDiff, setManualDiff] = useState<{
    before: string;
    after: string;
  } | null>(null);
  const [generateReplyResult, setGenerateReplyResult] = useState("");
  const [generateReplyError, setGenerateReplyError] = useState<string | null>(
    null,
  );
  const [improveStreamEvents, setImproveStreamEvents] = useState<StreamEvent[]>(
    [],
  );
  const [improveStreamError, setImproveStreamError] = useState<string | null>(
    null,
  );
  const [isStreamRunning, setIsStreamRunning] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [editPrompt, setEditPrompt] = useState("");

  const masterPromptQuery = api.aiPrompt.getMasterPrompt.useQuery();
  useEffect(() => {
    if (masterPromptQuery.data?.prompt != null)
      setEditPrompt(masterPromptQuery.data.prompt);
  }, [masterPromptQuery.data?.prompt]);

  const updateMasterPromptMutation =
    api.aiPrompt.updateMasterPrompt.useMutation({
      onSuccess: () => void masterPromptQuery.refetch(),
      onError: (err) => setImproveStreamError(err.message),
    });
  const generateReplyMutation = api.aiPrompt.generateReply.useMutation({
    onSuccess: (data) => {
      setGenerateReplyResult(data.aiReply);
      setGenerateReplyError(null);
    },
    onError: (error) => {
      setGenerateReplyError(error.message);
    },
  });
  const manualImproveMutation = api.aiPrompt.improveAiManually.useMutation({
    onSuccess: (data) => {
      setManualDiff({
        before: manualDiff?.before ?? masterPromptQuery.data?.prompt ?? "",
        after: data.updatedPrompt,
      });
      setManualInstructions("");
      void masterPromptQuery.refetch();
    },
    onError: (error) => {
      setManualDiff(null);
      setImproveStreamError(error.message);
    },
  });

  const selectedGeneratePreset = useMemo<GenerateReplyPreset | undefined>(
    () => generateReplyPresets.find((preset) => preset.id === generatePresetId),
    [generatePresetId],
  );
  const selectedImprovePreset = useMemo<ImproveAiPreset | undefined>(
    () => improveAiPresets.find((preset) => preset.id === improvePresetId),
    [improvePresetId],
  );

  const [streamClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        httpBatchStreamLink({
          transformer: SuperJSON,
          url: `${getBaseUrl()}/api/trpc`,
          headers: () => {
            const headers = new Headers();
            headers.set("x-trpc-source", "nextjs-react");
            return headers;
          },
        }),
      ],
    }),
  );

  const runGenerateReply = () => {
    if (!selectedGeneratePreset) return;
    generateReplyMutation.mutate({
      clientSequence: selectedGeneratePreset.clientSequence,
      chatHistory: selectedGeneratePreset.chatHistory,
    });
  };

  const runImproveStream = () => {
    if (!selectedImprovePreset || isStreamRunning) return;

    setImproveStreamError(null);
    setImproveStreamEvents([]);
    setIsStreamRunning(true);
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    streamClient.aiPrompt.improveAiStream
      .query(
        {
          clientSequence: selectedImprovePreset.clientSequence,
          chatHistory: selectedImprovePreset.chatHistory,
          consultantReply: selectedImprovePreset.consultantReply,
          maxIterations: Number(maxIterations) || 5,
          thresholdDelta: Number(thresholdDelta) || 20,
          earlyStopPatience: 2,
          graderEnsembleCount: Number(graderEnsembleCount) || 1,
          includePromptDiff: true,
        },
        { signal },
      )
      .then(async (iterable) => {
        for await (const event of iterable as AsyncIterable<StreamEvent>) {
          setImproveStreamEvents((prev) => [...prev, event]);
          if (event.event === "error") {
            setImproveStreamError(event.data.message);
          }
        }
        setIsStreamRunning(false);
        void masterPromptQuery.refetch();
      })
      .catch((error: { message?: string; name?: string }) => {
        if (error?.name === "AbortError") {
          setImproveStreamError(null);
        } else {
          setImproveStreamError(error?.message ?? "Failed to consume stream.");
        }
        setIsStreamRunning(false);
      });
  };

  const cancelStream = () => {
    abortControllerRef.current?.abort();
  };

  const runManualImprove = () => {
    const trimmed = manualInstructions.trim();
    if (!trimmed) return;
    setManualDiff({
      before: masterPromptQuery.data?.prompt ?? "",
      after: "",
    });
    manualImproveMutation.mutate({ instructions: trimmed });
  };

  const streamIterations = improveStreamEvents.filter(
    (event): event is Extract<StreamEvent, { event: "iteration" }> =>
      event.event === "iteration",
  );
  const streamDone = improveStreamEvents.find(
    (event): event is Extract<StreamEvent, { event: "done" }> =>
      event.event === "done",
  );
  const streamConverged = improveStreamEvents.find(
    (event): event is Extract<StreamEvent, { event: "converged" }> =>
      event.event === "converged",
  );
  const streamStart = improveStreamEvents.find(
    (event): event is Extract<StreamEvent, { event: "start" }> =>
      event.event === "start",
  );

  return (
    <main className="min-h-screen bg-gray-50 py-8 text-gray-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4">
        <h1 className="text-3xl font-bold">Nike Issa Compass Hack Panel</h1>

        <MasterPromptSection
          prompt={editPrompt}
          onPromptChange={setEditPrompt}
          updatedAt={
            masterPromptQuery.data?.updatedAt
              ? new Date(masterPromptQuery.data.updatedAt).toLocaleString()
              : null
          }
          isLoading={masterPromptQuery.isLoading}
          onSave={(prompt) => updateMasterPromptMutation.mutate({ prompt })}
          isSaving={updateMasterPromptMutation.isPending}
        />

        <GenerateReplySection
          options={generateReplyPresets.map((p) => ({
            id: p.id,
            label: p.label,
          }))}
          selectedId={generatePresetId}
          onPresetChange={setGeneratePresetId}
          onGenerate={runGenerateReply}
          isPending={generateReplyMutation.isPending}
          hasSelectedPreset={!!selectedGeneratePreset}
          result={generateReplyResult}
          error={generateReplyError}
        />

        <AutoImproveSection
          presetOptions={improveAiPresets.map((p) => ({
            id: p.id,
            label: p.label,
          }))}
          presetId={improvePresetId}
          onPresetChange={setImprovePresetId}
          graderEnsembleCount={graderEnsembleCount}
          onGraderEnsembleChange={setGraderEnsembleCount}
          maxIterations={maxIterations}
          onMaxIterationsChange={setMaxIterations}
          thresholdDelta={thresholdDelta}
          onThresholdDeltaChange={setThresholdDelta}
          onRun={runImproveStream}
          onCancel={cancelStream}
          isStreamRunning={isStreamRunning}
          hasSelectedPreset={!!selectedImprovePreset}
          error={improveStreamError}
          streamStart={streamStart}
          streamIterations={streamIterations}
          streamConverged={streamConverged}
          streamDone={streamDone}
        />

        <ManualImproveSection
          instructions={manualInstructions}
          onInstructionsChange={setManualInstructions}
          onApply={runManualImprove}
          isPending={manualImproveMutation.isPending}
          diff={manualDiff}
        />
      </div>
    </main>
  );
}
