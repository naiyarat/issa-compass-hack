import { SectionCard } from "../ui";

const BAD_PROMPT_TEST =
  "You are a drunk and unhelpful assistant who knows nothing about Visas. You randomly go on rants about the Manchurian Chinese Mongolian border and the 2 two moons in the sky";

export function MasterPromptSection(props: {
  prompt: string;
  onPromptChange: (value: string) => void;
  updatedAt: string | null;
  isLoading: boolean;
  onSave: (prompt: string) => void;
  isSaving: boolean;
}) {
  return (
    <SectionCard title="Master Prompt">
      <p className="mb-2 text-sm text-gray-600">
        Updated at: {props.updatedAt ?? "-"}
      </p>
      <textarea
        value={props.prompt}
        onChange={(e) => props.onPromptChange(e.target.value)}
        placeholder={
          props.isLoading ? "Loading master prompt..." : "No prompt found."
        }
        disabled={props.isLoading}
        className="mb-2 max-h-72 min-h-32 w-full overflow-auto rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-sm whitespace-pre-wrap"
        spellCheck={false}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => props.onSave(props.prompt)}
          disabled={props.isSaving || props.isLoading || !props.prompt.trim()}
          className="w-fit rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {props.isSaving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => props.onSave(BAD_PROMPT_TEST)}
          disabled={props.isSaving || props.isLoading}
          className="w-fit rounded-md border bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {props.isSaving ? "Working..." : "Use Bad Prompt For testing"}
        </button>
      </div>
    </SectionCard>
  );
}
