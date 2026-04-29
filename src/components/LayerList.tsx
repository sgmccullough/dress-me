import { Activity, LayerRecommendation } from "@/lib/types";

interface Props {
  recommendation: LayerRecommendation;
  activity: Activity;
}

const activityLabel: Record<Activity, string> = {
  running: "Running",
  cycling: "Cycling",
};

export default function LayerList({ recommendation, activity }: Props) {
  const { layers, notes } = recommendation;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full max-w-sm">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
        {activityLabel[activity]} — What to wear
      </h2>
      <ol className="space-y-2">
        {layers.map((layer, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium mt-0.5">
              {i + 1}
            </span>
            <span className="text-gray-800 text-sm">{layer}</span>
          </li>
        ))}
      </ol>
      {notes.length > 0 && (
        <div className="mt-4 space-y-2">
          {notes.map((note, i) => {
            const isWind = note.toLowerCase().includes("wind");
            return (
              <p
                key={i}
                className={`text-xs px-3 py-2 rounded-lg ${
                  isWind
                    ? "bg-yellow-50 text-yellow-700"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                {note}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
