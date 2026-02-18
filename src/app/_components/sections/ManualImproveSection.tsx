import { SectionCard } from "../ui";

export function ManualImproveSection(props: {
  instructions: string;
  onInstructionsChange: (value: string) => void;
  onApply: () => void;
  isPending: boolean;
  diff: { before: string; after: string } | null;
}) {
  return (
    <SectionCard title="Manual Improve Prompt">
      <div className="grid gap-3">
        <textarea
          value={props.instructions}
          onChange={(e) => props.onInstructionsChange(e.target.value)}
          placeholder="Enter manual improvement instructions..."
          className="min-h-24 rounded-md border border-gray-300 bg-white p-3 text-sm"
        />
        <button
          type="button"
          onClick={props.onApply}
          disabled={props.isPending || !props.instructions.trim()}
          className="w-fit rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {props.isPending ? "Updating..." : "Apply Manual Improve"}
        </button>

        {props.diff ? (
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <p className="mb-1 text-sm font-medium">Old Master Prompt</p>
              <pre className="max-h-72 overflow-auto rounded border border-gray-200 bg-gray-50 p-3 text-xs whitespace-pre-wrap">
                {props.diff.before || "(empty)"}
              </pre>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">
                Updated Master Prompt
              </p>
              <pre className="max-h-72 overflow-auto rounded border border-gray-200 bg-gray-50 p-3 text-xs whitespace-pre-wrap">
                {props.diff.after || "(waiting for update...)"}
              </pre>
            </div>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
