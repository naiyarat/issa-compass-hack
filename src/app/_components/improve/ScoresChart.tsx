"use client";

import {
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import type { ScoresShape } from "@/app/_types";
import { DIMENSION_LABELS } from "@/app/_types";

export function ScoresChart(props: {
  aiScores: ScoresShape;
  consultantScores: ScoresShape;
}) {
  return (
    <div className="my-6 h-48 w-full pr-8">
      <p className="mb-1 text-sm font-medium">
        Behavioral Alignment Visualization
      </p>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={DIMENSION_LABELS.map(([label, key]) => ({
            attribute: label,
            Consultant: props.consultantScores[key],
            AI: props.aiScores[key],
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
  );
}
