import type { StreamEvent } from "@/app/_types";

type StartEvent = Extract<StreamEvent, { event: "start" }>;

export function GroundTruthCard({ data }: { data: StartEvent["data"] }) {
  return (
    <div className="rounded-md border border-blue-200 bg-blue-50/30 p-3">
      <h3 className="mb-2 text-sm font-semibold text-blue-900">
        Ground truth
      </h3>
      <p className="mb-1 text-xs font-medium text-blue-800">
        Responder context (user prompt sent to model):
      </p>
      <pre className="mb-2 max-h-48 overflow-auto rounded border border-blue-100 bg-white p-2 text-xs whitespace-pre-wrap">
        {data.responderUserPrompt}
      </pre>
      <p className="mb-1 text-xs font-medium text-blue-800">
        Consultant reply (target):
      </p>
      <pre className="max-h-48 overflow-auto rounded border border-blue-100 bg-white p-2 text-xs whitespace-pre-wrap">
        {data.consultantReply}
      </pre>
    </div>
  );
}
