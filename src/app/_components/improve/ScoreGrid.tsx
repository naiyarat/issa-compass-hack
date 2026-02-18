import type { ScoresShape } from "@/app/_types";
import { DIMENSION_LABELS, scoreEntries } from "@/app/_types";

export function ScoreGrid(props: {
  label: string;
  scores: ScoresShape;
  variant: "ai" | "consultant";
}) {
  const borderClass =
    props.variant === "ai"
      ? "border-amber-200 bg-amber-50/50"
      : "border-blue-200 bg-blue-50/50";

  return (
    <div>
      <p className="mb-1 font-medium text-gray-700">{props.label}</p>
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
        {scoreEntries(props.scores).map(([label, value]) => (
          <div
            key={label}
            className={`rounded border p-2 ${borderClass}`}
          >
            <p className="text-gray-500">{label}</p>
            <p className="font-medium">{value.toFixed(1)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
