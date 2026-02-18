"use client";

import {
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import ReactDiffViewer from "react-diff-viewer-continued";
import { api } from "@/trpc/react";
import {
  createTRPCClient,
  httpBatchStreamLink,
  loggerLink,
} from "@trpc/client";
import { useEffect, useMemo, useRef, useState } from "react";
import SuperJSON from "superjson";

import {
  type GenerateReplyPreset,
  type ImproveAiPreset,
  generateReplyPresets,
  improveAiPresets,
} from "@/app/_data/conversation-request-options";
import { type AppRouter } from "@/server/api/root";

type StreamEvent =
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
  | { event: "error"; data: { runId: string; message: string } };

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

const DIMENSION_LABELS = [
  ["Proactiveness", "proactiveness"],
  ["Sales Intent", "salesIntent"],
  ["Empathy", "empathy"],
  ["Clarity", "clarity"],
  ["Urgency", "urgency"],
  ["Tone", "toneMatch"],
  ["Length", "lengthMatch"],
] as const;

type ScoresShape = {
  proactiveness: number;
  salesIntent: number;
  empathy: number;
  clarity: number;
  urgency: number;
  toneMatch: number;
  lengthMatch: number;
};

function scoreEntries(scores: ScoresShape) {
  return DIMENSION_LABELS.map(([label, key]) => [label, scores[key]]) as [
    string,
    number,
  ][];
}

function SectionCard(props: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        {props.title}
      </h2>
      {props.children}
    </section>
  );
}

function SimpleDropdown(props: {
  options: Array<{ id: string; label: string }>;
  selectedId: string;
  onChange: (nextId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected =
    props.options.find((opt) => opt.id === props.selectedId) ??
    props.options[0];

  return (
    <div className="relative">
      <button
        type="button"
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900"
        onClick={() => setOpen((prev) => !prev)}
      >
        {selected?.label ?? "Select request"}
      </button>
      {open ? (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-gray-300 bg-white shadow">
          {props.options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`block w-full px-3 py-2 text-left text-sm ${
                opt.id === props.selectedId
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => {
                props.onChange(opt.id);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

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
        <h1 className="text-3xl font-bold">Nike's Issa Compass Hack Panel</h1>

        <SectionCard title="Master Prompt">
          <p className="mb-2 text-sm text-gray-600">
            Updated at:{" "}
            {masterPromptQuery.data?.updatedAt
              ? new Date(masterPromptQuery.data.updatedAt).toLocaleString()
              : "-"}
          </p>
          <textarea
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            placeholder={
              masterPromptQuery.isLoading
                ? "Loading master prompt..."
                : "No prompt found."
            }
            disabled={masterPromptQuery.isLoading}
            className="mb-2 max-h-72 min-h-32 w-full overflow-auto rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-sm whitespace-pre-wrap"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() =>
              updateMasterPromptMutation.mutate({ prompt: editPrompt })
            }
            disabled={
              updateMasterPromptMutation.isPending ||
              masterPromptQuery.isLoading ||
              !editPrompt.trim()
            }
            className="w-fit rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {updateMasterPromptMutation.isPending ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() =>
              updateMasterPromptMutation.mutate({
                prompt:
                  "You are a drunk and unhelpful assistant who knows nothing about Visas. You randomly go on rants about the Manchurian Chinese Mongolian border and the 2 two moons in the sky",
              })
            }
            disabled={
              updateMasterPromptMutation.isPending ||
              masterPromptQuery.isLoading ||
              !editPrompt.trim()
            }
            className="ml-2 w-fit rounded-md border bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {updateMasterPromptMutation.isPending
              ? "Working..."
              : "Use Bad Prompt For testing"}
          </button>
        </SectionCard>

        <SectionCard title="Generate Reply">
          <div className="grid gap-3">
            <SimpleDropdown
              options={generateReplyPresets.map((preset) => ({
                id: preset.id,
                label: preset.label,
              }))}
              selectedId={generatePresetId}
              onChange={setGeneratePresetId}
            />
            <button
              type="button"
              onClick={runGenerateReply}
              disabled={
                generateReplyMutation.isPending || !selectedGeneratePreset
              }
              className="w-fit rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {generateReplyMutation.isPending
                ? "Generating..."
                : "Generate Reply"}
            </button>
            {generateReplyError ? (
              <p className="text-sm text-red-600">{generateReplyError}</p>
            ) : null}
            <pre className="min-h-24 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm whitespace-pre-wrap">
              {generateReplyResult || "Reply output will appear here."}
            </pre>
          </div>
        </SectionCard>

        <SectionCard title="Auto Improve (Stream)">
          <div className="grid gap-3">
            <SimpleDropdown
              options={improveAiPresets.map((preset) => ({
                id: preset.id,
                label: preset.label,
              }))}
              selectedId={improvePresetId}
              onChange={setImprovePresetId}
            />
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="grader-ensemble"
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  Grader ensemble count (recommend 1)
                </label>
                <input
                  id="grader-ensemble"
                  type="number"
                  min={1}
                  max={10}
                  value={graderEnsembleCount}
                  onChange={(e) => setGraderEnsembleCount(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="max-iterations"
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  Max iterations
                </label>
                <input
                  id="max-iterations"
                  type="number"
                  min={1}
                  max={10}
                  value={maxIterations}
                  onChange={(e) => setMaxIterations(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="threshold-delta"
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  Diff threshold (converge when avg delta ≤)
                </label>
                <input
                  id="threshold-delta"
                  type="number"
                  min={0}
                  max={100}
                  value={thresholdDelta}
                  onChange={(e) => setThresholdDelta(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={runImproveStream}
                disabled={isStreamRunning || !selectedImprovePreset}
                className="w-fit rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {isStreamRunning ? "Streaming..." : "Run Auto Improve"}
              </button>
              {isStreamRunning ? (
                <button
                  type="button"
                  onClick={cancelStream}
                  className="w-fit rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                >
                  Cancel
                </button>
              ) : null}
            </div>
            {improveStreamError ? (
              <p className="text-sm text-red-600">{improveStreamError}</p>
            ) : null}

            {streamStart ? (
              <div className="rounded-md border border-blue-200 bg-blue-50/30 p-3">
                <h3 className="mb-2 text-sm font-semibold text-blue-900">
                  Ground truth
                </h3>
                <p className="mb-1 text-xs font-medium text-blue-800">
                  Responder context (user prompt sent to model):
                </p>
                <pre className="mb-2 max-h-48 overflow-auto rounded border border-blue-100 bg-white p-2 text-xs whitespace-pre-wrap">
                  {streamStart.data.responderUserPrompt}
                </pre>
                <p className="mb-1 text-xs font-medium text-blue-800">
                  Consultant reply (target):
                </p>
                <pre className="max-h-48 overflow-auto rounded border border-blue-100 bg-white p-2 text-xs whitespace-pre-wrap">
                  {streamStart.data.consultantReply}
                </pre>
              </div>
            ) : null}

            <div className="grid gap-3">
              {streamIterations.map((item) => (
                <article
                  key={`${item.data.runId}-${item.data.iteration}`}
                  className="rounded-md border border-gray-200 bg-gray-50 p-3"
                >
                  <h3 className="mb-2 text-sm font-semibold">
                    Iteration {item.data.iteration} - Avg Delta{" "}
                    {item.data.avgDelta.toFixed(2)}
                  </h3>
                  <p className="mb-2 text-xs text-gray-600">
                    Prompt hashes: {item.data.promptBeforeHash.slice(0, 12)}{" "}
                    {"->"} {item.data.promptAfterHash.slice(0, 12)}
                  </p>

                  <p className="mb-1 text-sm font-medium">
                    AI predicted reply:
                  </p>
                  <pre className="mb-3 max-h-32 overflow-auto rounded border border-amber-200 bg-amber-50/50 p-2 text-xs whitespace-pre-wrap">
                    {item.data.predictedReply}
                  </pre>

                  <div className="mb-2 grid gap-2 text-xs sm:grid-cols-2">
                    <div>
                      <p className="mb-1 font-medium text-gray-700">
                        AI scores (predictedReply)
                      </p>
                      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                        {scoreEntries(item.data.avgAiScores).map(
                          ([label, value]) => (
                            <div
                              key={`ai-${label}`}
                              className="rounded border border-amber-200 bg-amber-50/50 p-2"
                            >
                              <p className="text-gray-500">{label}</p>
                              <p className="font-medium">{value.toFixed(1)}</p>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="mb-1 font-medium text-gray-700">
                        Consultant scores (target)
                      </p>
                      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                        {scoreEntries(item.data.avgConsultantScores).map(
                          ([label, value]) => (
                            <div
                              key={`consultant-${label}`}
                              className="rounded border border-blue-200 bg-blue-50/50 p-2"
                            >
                              <p className="text-gray-500">{label}</p>
                              <p className="font-medium">{value.toFixed(1)}</p>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="my-6 h-48 w-full pr-8">
                    <p className="mb-1 text-sm font-medium">
                      Behavioral Alignment Visualization
                    </p>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        title="Behavioral Alignment"
                        data={DIMENSION_LABELS.map(([label, key]) => ({
                          attribute: label,
                          Consultant: item.data.avgConsultantScores[key],
                          AI: item.data.avgAiScores[key],
                        }))}
                        margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                      >
                        <XAxis
                          dataKey="attribute"
                          tick={{ fontSize: 10 }}
                          interval={0}
                          angle={-25}
                          textAnchor="end"
                          height={50}
                        />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Line
                          type="monotone"
                          dataKey="Consultant"
                          stroke="#2563eb"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="AI"
                          stroke="#ca8a04"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                        <Legend />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <p className="mb-2 text-sm">
                    <span className="font-medium">Diagnosis:</span>{" "}
                    {item.data.diagnosis}
                  </p>
                  <p className="mb-1 text-sm font-medium">
                    Editor recommended edits:
                  </p>
                  <ul className="mb-2 list-disc pl-5 text-sm">
                    {item.data.recommendedEdits.map((edit, idx) => (
                      <li key={`${item.data.iteration}-${idx}`}>{edit}</li>
                    ))}
                  </ul>

                  <p className="mb-1 text-sm font-medium">
                    Prompt evolution (master prompt iteration):
                  </p>
                  <div className="max-h-64 overflow-auto rounded border border-gray-200 bg-white text-xs">
                    <ReactDiffViewer
                      oldValue={item.data.promptBeforePreview ?? ""}
                      newValue={item.data.promptAfterPreview ?? ""}
                      splitView={false}
                      showDiffOnly={false}
                      useDarkTheme={false}
                    />
                  </div>
                </article>
              ))}
            </div>

            {streamConverged ? (
              <p className="text-sm text-green-700">
                Converged at iteration {streamConverged.data.iteration} with
                best delta {streamConverged.data.bestDelta.toFixed(2)}.
              </p>
            ) : null}
            {streamDone ? (
              <p className="text-sm text-gray-700">
                Final result: {streamDone.data.iterations} iterations, best
                delta {streamDone.data.bestDelta.toFixed(2)}, stored at{" "}
                {new Date(
                  streamDone.data.updatedPromptStoredAt,
                ).toLocaleString()}
                .
              </p>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="Manual Improve Prompt">
          <div className="grid gap-3">
            <textarea
              value={manualInstructions}
              onChange={(e) => setManualInstructions(e.target.value)}
              placeholder="Enter manual improvement instructions..."
              className="min-h-24 rounded-md border border-gray-300 bg-white p-3 text-sm"
            />
            <button
              type="button"
              onClick={runManualImprove}
              disabled={
                manualImproveMutation.isPending || !manualInstructions.trim()
              }
              className="w-fit rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {manualImproveMutation.isPending
                ? "Updating..."
                : "Apply Manual Improve"}
            </button>

            {manualDiff ? (
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-sm font-medium">Old Master Prompt</p>
                  <pre className="max-h-72 overflow-auto rounded border border-gray-200 bg-gray-50 p-3 text-xs whitespace-pre-wrap">
                    {manualDiff.before || "(empty)"}
                  </pre>
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium">
                    Updated Master Prompt
                  </p>
                  <pre className="max-h-72 overflow-auto rounded border border-gray-200 bg-gray-50 p-3 text-xs whitespace-pre-wrap">
                    {manualDiff.after || "(waiting for update...)"}
                  </pre>
                </div>
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
