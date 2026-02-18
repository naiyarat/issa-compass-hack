import type { StreamEvent } from "@/app/_types";

import { GroundTruthCard, IterationCard } from "../improve";
import { SectionCard, SimpleDropdown } from "../ui";

function LabeledInput(props: {
  id: string;
  label: string;
  type: string;
  min?: number;
  max?: number;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={props.id}
        className="mb-1 block text-xs font-medium text-gray-600"
      >
        {props.label}
      </label>
      <input
        id={props.id}
        type={props.type}
        min={props.min}
        max={props.max}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
    </div>
  );
}

export function AutoImproveSection(props: {
  presetOptions: Array<{ id: string; label: string }>;
  presetId: string;
  onPresetChange: (id: string) => void;
  graderEnsembleCount: string;
  onGraderEnsembleChange: (v: string) => void;
  maxIterations: string;
  onMaxIterationsChange: (v: string) => void;
  thresholdDelta: string;
  onThresholdDeltaChange: (v: string) => void;
  onRun: () => void;
  onCancel: () => void;
  isStreamRunning: boolean;
  hasSelectedPreset: boolean;
  error: string | null;
  streamStart: Extract<StreamEvent, { event: "start" }> | undefined;
  streamIterations: Extract<StreamEvent, { event: "iteration" }>[];
  streamConverged: Extract<StreamEvent, { event: "converged" }> | undefined;
  streamDone: Extract<StreamEvent, { event: "done" }> | undefined;
}) {
  return (
    <SectionCard title="Auto Improve (Stream)">
      <div className="grid gap-3">
        <SimpleDropdown
          options={props.presetOptions}
          selectedId={props.presetId}
          onChange={props.onPresetChange}
        />
        <div className="grid gap-2 sm:grid-cols-3">
          <LabeledInput
            id="grader-ensemble"
            label="Grader ensemble count (recommend 1)"
            type="number"
            min={1}
            max={10}
            value={props.graderEnsembleCount}
            onChange={props.onGraderEnsembleChange}
          />
          <LabeledInput
            id="max-iterations"
            label="Max iterations"
            type="number"
            min={1}
            max={10}
            value={props.maxIterations}
            onChange={props.onMaxIterationsChange}
          />
          <LabeledInput
            id="threshold-delta"
            label="Diff threshold (converge when avg delta ≤)"
            type="number"
            min={0}
            max={100}
            value={props.thresholdDelta}
            onChange={props.onThresholdDeltaChange}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={props.onRun}
            disabled={props.isStreamRunning || !props.hasSelectedPreset}
            className="w-fit rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {props.isStreamRunning ? "Streaming..." : "Run Auto Improve"}
          </button>
          {props.isStreamRunning ? (
            <button
              type="button"
              onClick={props.onCancel}
              className="w-fit rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              Cancel
            </button>
          ) : null}
        </div>
        {props.error ? (
          <p className="text-sm text-red-600">{props.error}</p>
        ) : null}

        {props.streamStart ? (
          <GroundTruthCard data={props.streamStart.data} />
        ) : null}

        <div className="grid gap-3">
          {props.streamIterations.map((item) => (
            <IterationCard key={`${item.data.runId}-${item.data.iteration}`} data={item.data} />
          ))}
        </div>

        {props.streamConverged ? (
          <p className="text-sm text-green-700">
            Converged at iteration {props.streamConverged.data.iteration} with
            best delta {props.streamConverged.data.bestDelta.toFixed(2)}.
          </p>
        ) : null}
        {props.streamDone ? (
          <p className="text-sm text-gray-700">
            Final result: {props.streamDone.data.iterations} iterations, best
            delta {props.streamDone.data.bestDelta.toFixed(2)}, stored at{" "}
            {new Date(
              props.streamDone.data.updatedPromptStoredAt,
            ).toLocaleString()}
            .
          </p>
        ) : null}
      </div>
    </SectionCard>
  );
}
