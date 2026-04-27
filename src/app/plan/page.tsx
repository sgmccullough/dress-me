"use client";

import { useEffect, useState } from "react";
import {
  ClothingItem,
  StravaRoute,
  WaypointForecast,
  WardrobeRecommendation,
  RouteConditions,
  Activity,
} from "@/lib/types";
import { sampleWaypoints, computeWorstCase } from "@/lib/routePlanning";
import { getWardrobeRecommendation } from "@/lib/layering";

const METERS_TO_MILES = 0.000621371;
const METERS_TO_FEET = 3.28084;

export default function PlanPage() {
  const [routes, setRoutes] = useState<StravaRoute[]>([]);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [stravaError, setStravaError] = useState<string | null>(null);

  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [departureTime, setDepartureTime] = useState<string>("");
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const [conditions, setConditions] = useState<RouteConditions | null>(null);
  const [recommendation, setRecommendation] =
    useState<WardrobeRecommendation | null>(null);
  const [selectedRouteName, setSelectedRouteName] = useState("");

  useEffect(() => {
    fetch("/api/strava/routes")
      .then(async (res) => {
        if (res.status === 401) {
          setStravaError("not_connected");
        } else if (!res.ok) {
          setStravaError("Failed to load Strava routes");
        } else {
          const data = await res.json();
          setRoutes(Array.isArray(data) ? data : []);
        }
        setRoutesLoading(false);
      })
      .catch(() => {
        setStravaError("Failed to load Strava routes");
        setRoutesLoading(false);
      });
  }, []);

  async function handlePlan() {
    if (!selectedRouteId || !departureTime) return;

    setPlanning(true);
    setPlanError(null);
    setConditions(null);
    setRecommendation(null);

    try {
      const departureUnix = Math.floor(
        new Date(departureTime).getTime() / 1000,
      );

      const [streamsRes, wardrobeRes] = await Promise.all([
        fetch(`/api/strava/routes/${selectedRouteId}`),
        fetch("/api/wardrobe"),
      ]);

      if (!streamsRes.ok) throw new Error("Failed to fetch route streams");

      const streams = await streamsRes.json();
      const wardrobe: ClothingItem[] = wardrobeRes.ok
        ? await wardrobeRes.json()
        : [];

      const waypoints = sampleWaypoints(streams, departureUnix, 5);

      const forecastResults = await Promise.all(
        waypoints.map((wp) =>
          fetch(
            `/api/weather/forecast?lat=${wp.lat}&lon=${wp.lon}&dt=${wp.estimatedArrivalUnix}`,
          )
            .then((r) => r.json())
            .then(
              (weather) =>
                ({
                  ...wp,
                  weather,
                }) as WaypointForecast,
            ),
        ),
      );

      const startElevFt = waypoints[0]?.elevationFt ?? 0;
      const worstCase = computeWorstCase(forecastResults, startElevFt);
      const rec = getWardrobeRecommendation(
        worstCase,
        wardrobe,
        "cycling" as Activity,
      );

      setConditions(worstCase);
      setRecommendation(rec);

      const route = routes.find((r) => r.id === selectedRouteId);
      if (route) setSelectedRouteName(route.name);
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Planning failed");
    } finally {
      setPlanning(false);
    }
  }

  if (routesLoading) {
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
            Connect Strava to plan rides from your saved routes.
          </p>
          <a
            href="/api/auth/signin"
            className="inline-block px-5 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
          >
            Connect Strava
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-sm mx-auto flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-gray-900">Plan a Ride</h1>

        {stravaError && stravaError !== "not_connected" && (
          <p className="text-sm text-red-500">{stravaError}</p>
        )}

        {routes.length === 0 && !stravaError ? (
          <p className="text-sm text-gray-400">
            No saved routes found on Strava.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Select a route</label>
              <select
                value={selectedRouteId ?? ""}
                onChange={(e) => setSelectedRouteId(Number(e.target.value))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a route...</option>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name} —{" "}
                    {(route.distance * METERS_TO_MILES).toFixed(1)} mi
                    {route.elevation_gain > 0
                      ? ` / +${Math.round(route.elevation_gain * METERS_TO_FEET)} ft`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Departure time</label>
              <input
                type="datetime-local"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handlePlan}
              disabled={!selectedRouteId || !departureTime || planning}
              className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {planning ? "Planning..." : "Plan this ride"}
            </button>

            {planError && <p className="text-sm text-red-500">{planError}</p>}
          </div>
        )}

        {conditions && recommendation && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
                {selectedRouteName} — Worst-case conditions
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Feels like</p>
                  <p className="font-medium text-gray-800">
                    {Math.round(conditions.worstFeelsLike)}°F
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Max wind</p>
                  <p className="font-medium text-gray-800">
                    {Math.round(conditions.maxWindSpeed)} mph
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Precipitation</p>
                  <p className="font-medium text-gray-800">
                    {conditions.hasPrecipitation ? "Yes" : "No"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Elevation gain</p>
                  <p className="font-medium text-gray-800">
                    {Math.round(conditions.maxElevationGain)} ft
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
                Recommended layers
                {recommendation.isGeneric && (
                  <span className="ml-2 text-orange-500 normal-case">
                    (generic — add items to your wardrobe for personal
                    recommendations)
                  </span>
                )}
              </p>
              <ol className="space-y-2">
                {recommendation.layers.map((layer, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-gray-800 text-sm">{layer.name}</span>
                  </li>
                ))}
              </ol>
              {recommendation.notes.length > 0 && (
                <div className="mt-4 space-y-2">
                  {recommendation.notes.map((note, i) => (
                    <p
                      key={i}
                      className="text-xs px-3 py-2 rounded-lg bg-yellow-50 text-yellow-700"
                    >
                      {note}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
