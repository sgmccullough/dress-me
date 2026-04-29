"use client";

import { useEffect, useState } from "react";
import { ActivityLog, ClothingItem, StravaActivity } from "@/lib/types";
import { connectStrava } from "./actions";

const METERS_TO_MILES = 0.000621371;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDistance(meters: number) {
  return (meters * METERS_TO_MILES).toFixed(1) + " mi";
}

export default function LogPage() {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stravaError, setStravaError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Record<number, Set<string>>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [saved, setSaved] = useState<Set<number>>(new Set());

  useEffect(() => {
    Promise.all([
      fetch("/api/strava/activities").then(async (r) => {
        if (r.status === 401) {
          setStravaError("not_connected");
          return [];
        }
        if (!r.ok) {
          setStravaError("Failed to load Strava activities");
          return [];
        }
        return r.json();
      }),
      fetch("/api/activity-logs").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/wardrobe").then((r) => (r.ok ? r.json() : [])),
    ]).then(([acts, existingLogs, items]) => {
      setActivities(Array.isArray(acts) ? acts : []);
      setLogs(Array.isArray(existingLogs) ? existingLogs : []);
      setWardrobe(Array.isArray(items) ? items : []);

      const initialSelected: Record<number, Set<string>> = {};
      for (const log of existingLogs as ActivityLog[]) {
        const actId = Number(log.stravaActivityId);
        initialSelected[actId] = new Set(log.items.map((i) => i.id));
      }
      setSelected(initialSelected);

      setLoading(false);
    });
  }, []);

  function logForActivity(activityId: number): ActivityLog | undefined {
    return logs.find((l) => l.stravaActivityId === String(activityId));
  }

  function toggleItem(activityId: number, itemId: string) {
    setSelected((prev) => {
      const current = new Set(prev[activityId] ?? []);
      if (current.has(itemId)) {
        current.delete(itemId);
      } else {
        current.add(itemId);
      }
      return { ...prev, [activityId]: current };
    });
  }

  function toggleExpanded(activityId: number) {
    setExpandedId((prev) => (prev === activityId ? null : activityId));
  }

  async function saveLog(activity: StravaActivity) {
    setSaving(activity.id);
    const clothingItemIds = Array.from(selected[activity.id] ?? []);

    const res = await fetch("/api/activity-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stravaActivityId: String(activity.id),
        activityName: activity.name,
        activityDate: activity.start_date,
        clothingItemIds,
        temperature: activity.average_temp ?? null,
      }),
    });

    if (res.ok) {
      const updated: ActivityLog = await res.json();
      setLogs((prev) => {
        const without = prev.filter(
          (l) => l.stravaActivityId !== String(activity.id),
        );
        return [updated, ...without];
      });
      setSaved((prev) => new Set([...prev, activity.id]));
      setTimeout(
        () =>
          setSaved((prev) => {
            const s = new Set(prev);
            s.delete(activity.id);
            return s;
          }),
        2000,
      );
    }

    setSaving(null);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (stravaError === "not_connected") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-gray-600 mb-4">
            Connect Strava to log what you wore on past rides.
          </p>
          <form action={connectStrava}>
            <button
              type="submit"
              className="inline-block px-5 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
            >
              Connect Strava
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-sm mx-auto flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-gray-900">Activity Log</h1>

        {stravaError && <p className="text-sm text-red-500">{stravaError}</p>}

        {activities.length === 0 && !stravaError && (
          <p className="text-sm text-gray-400">
            No recent Strava activities found.
          </p>
        )}

        {wardrobe.length === 0 && activities.length > 0 && (
          <p className="text-sm text-orange-500">
            Add items to your wardrobe first to log what you wore.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {activities.map((activity) => {
            const existingLog = logForActivity(activity.id);
            const isExpanded = expandedId === activity.id;
            const itemSet = selected[activity.id] ?? new Set<string>();
            const isSaving = saving === activity.id;
            const isSaved = saved.has(activity.id);

            return (
              <div
                key={activity.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => toggleExpanded(activity.id)}
                  className="w-full p-4 flex items-start justify-between gap-2 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(activity.start_date)}
                      {activity.distance > 0
                        ? ` · ${formatDistance(activity.distance)}`
                        : ""}
                      {activity.sport_type ? ` · ${activity.sport_type}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {existingLog && !isExpanded && (
                      <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                        {existingLog.items.length} items
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 flex flex-col gap-3 border-t border-gray-50 pt-3">
                    {wardrobe.length === 0 ? (
                      <p className="text-xs text-gray-400">
                        No wardrobe items yet.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {wardrobe.map((item) => (
                          <label
                            key={item.id}
                            className="flex items-center gap-2.5 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={itemSet.has(item.id)}
                              onChange={() => toggleItem(activity.id, item.id)}
                              className="rounded"
                            />
                            <span className="text-sm text-gray-700">
                              {item.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => saveLog(activity)}
                      disabled={isSaving || wardrobe.length === 0}
                      className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {isSaving ? "Saving..." : isSaved ? "Saved!" : "Save"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
