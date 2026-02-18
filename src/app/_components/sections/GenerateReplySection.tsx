import { SectionCard, SimpleDropdown } from "../ui";

export function GenerateReplySection(props: {
  options: Array<{ id: string; label: string }>;
  selectedId: string;
  onPresetChange: (id: string) => void;
  onGenerate: () => void;
  isPending: boolean;
  hasSelectedPreset: boolean;
  result: string;
  error: string | null;
}) {
  return (
    <SectionCard title="Generate Reply">
      <div className="grid gap-3">
        <SimpleDropdown
          options={props.options}
          selectedId={props.selectedId}
          onChange={props.onPresetChange}
        />
        <button
          type="button"
          onClick={props.onGenerate}
          disabled={props.isPending || !props.hasSelectedPreset}
          className="w-fit rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {props.isPending ? "Generating..." : "Generate Reply"}
        </button>
        {props.error ? (
          <p className="text-sm text-red-600">{props.error}</p>
        ) : null}
        <pre className="min-h-24 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm whitespace-pre-wrap">
          {props.result || "Reply output will appear here."}
        </pre>
      </div>
    </SectionCard>
  );
}
