import ReactDiffViewer from "react-diff-viewer-continued";

import type { StreamEvent } from "@/app/_types";
import { ScoreGrid } from "./ScoreGrid";
import { ScoresChart } from "./ScoresChart";

type IterationEvent = Extract<StreamEvent, { event: "iteration" }>;

export function IterationCard({ data }: { data: IterationEvent["data"] }) {
  return (
    <article className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <h3 className="mb-2 text-sm font-semibold">
        Iteration {data.iteration} - Avg Delta {data.avgDelta.toFixed(2)}
      </h3>
      <p className="mb-2 text-xs text-gray-600">
        Prompt hashes: {data.promptBeforeHash.slice(0, 12)} {"->"}{" "}
        {data.promptAfterHash.slice(0, 12)}
      </p>

      <p className="mb-1 text-sm font-medium">AI predicted reply:</p>
      <pre className="mb-3 max-h-32 overflow-auto rounded border border-amber-200 bg-amber-50/50 p-2 text-xs whitespace-pre-wrap">
        {data.predictedReply}
      </pre>

      <div className="mb-2 grid gap-2 text-xs sm:grid-cols-2">
        <ScoreGrid
          label="AI scores (predictedReply)"
          scores={data.avgAiScores}
          variant="ai"
        />
        <ScoreGrid
          label="Consultant scores (target)"
          scores={data.avgConsultantScores}
          variant="consultant"
        />
      </div>

      <ScoresChart
        aiScores={data.avgAiScores}
        consultantScores={data.avgConsultantScores}
      />

      <p className="mb-2 text-sm">
        <span className="font-medium">Diagnosis:</span> {data.diagnosis}
      </p>
      <p className="mb-1 text-sm font-medium">Editor recommended edits:</p>
      <ul className="mb-2 list-disc pl-5 text-sm">
        {data.recommendedEdits.map((edit, idx) => (
          <li key={`${data.iteration}-${idx}`}>{edit}</li>
        ))}
      </ul>

      <p className="mb-1 text-sm font-medium">
        Prompt evolution (master prompt iteration):
      </p>
      <div className="max-h-64 overflow-auto rounded border border-gray-200 bg-white text-xs">
        <ReactDiffViewer
          oldValue={data.promptBeforePreview ?? ""}
          newValue={data.promptAfterPreview ?? ""}
          splitView={false}
          showDiffOnly={false}
          useDarkTheme={false}
        />
      </div>
    </article>
  );
}
