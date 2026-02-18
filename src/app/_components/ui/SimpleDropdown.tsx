"use client";

import { useState } from "react";

export function SimpleDropdown(props: {
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
