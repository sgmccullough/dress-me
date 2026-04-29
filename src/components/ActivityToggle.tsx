"use client";

import { Activity } from "@/lib/types";

interface Props {
  activity: Activity;
  onChange: (a: Activity) => void;
}

const activities: { value: Activity; label: string }[] = [
  { value: "running", label: "Running" },
  { value: "cycling", label: "Cycling" },
];

export default function ActivityToggle({ activity, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {activities.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            activity === value
              ? "bg-blue-600 text-white"
              : "border border-blue-600 text-blue-600 hover:bg-blue-50"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
