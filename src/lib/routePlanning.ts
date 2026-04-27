import { SampledWaypoint, WaypointForecast, RouteConditions } from "./types";

interface StravaStream {
  type: string;
  data: unknown[];
}

const METERS_TO_FEET = 3.28084;
const AVG_CYCLING_SPEED_MPH = 14;
const METERS_PER_MILE = 1609.34;
const LAPSE_RATE_F_PER_1000FT = 3.5;

export function sampleWaypoints(
  streams: StravaStream[],
  departureUnix: number,
  sampleCount = 5
): SampledWaypoint[] {
  const latlngStream = streams.find((s) => s.type === "latlng");
  const altStream = streams.find((s) => s.type === "altitude");
  const distStream = streams.find((s) => s.type === "distance");

  if (!latlngStream || !altStream || !distStream) {
    throw new Error("Required streams (latlng, altitude, distance) not found");
  }

  const coords = latlngStream.data as [number, number][];
  const altMeters = altStream.data as number[];
  const distMeters = distStream.data as number[];
  const totalDist = distMeters[distMeters.length - 1] ?? 0;
  const totalDistMiles = totalDist / METERS_PER_MILE;
  const estTotalTimeSec = (totalDistMiles / AVG_CYCLING_SPEED_MPH) * 3600;

  const n = Math.max(3, sampleCount);
  const indices = Array.from({ length: n }, (_, i) =>
    Math.round((i / (n - 1)) * (coords.length - 1))
  );

  return indices.map((idx) => {
    const distFraction = totalDist > 0 ? (distMeters[idx] ?? 0) / totalDist : 0;
    const elapsedSec = distFraction * estTotalTimeSec;
    return {
      lat: coords[idx][0],
      lon: coords[idx][1],
      elevationFt: (altMeters[idx] ?? 0) * METERS_TO_FEET,
      estimatedArrivalUnix: departureUnix + Math.round(elapsedSec),
    };
  });
}

export function applyLapseRate(tempF: number, elevationGainFt: number): number {
  return tempF - (elevationGainFt / 1000) * LAPSE_RATE_F_PER_1000FT;
}

export function computeWorstCase(
  waypoints: WaypointForecast[],
  startElevationFt: number
): RouteConditions {
  let worstFeelsLike = Infinity;
  let worstTemp = Infinity;
  let maxWindSpeed = 0;
  let hasPrecipitation = false;
  let maxElevationFt = startElevationFt;

  for (const wp of waypoints) {
    const elevGain = Math.max(0, wp.elevationFt - startElevationFt);
    const adjustedFeelsLike = applyLapseRate(wp.weather.feelsLike, elevGain);
    const adjustedTemp = applyLapseRate(wp.weather.temp, elevGain);

    if (adjustedFeelsLike < worstFeelsLike) worstFeelsLike = adjustedFeelsLike;
    if (adjustedTemp < worstTemp) worstTemp = adjustedTemp;
    if (wp.weather.windSpeed > maxWindSpeed) maxWindSpeed = wp.weather.windSpeed;
    if (wp.weather.conditionId >= 200 && wp.weather.conditionId <= 622) {
      hasPrecipitation = true;
    }
    if (wp.elevationFt > maxElevationFt) maxElevationFt = wp.elevationFt;
  }

  return {
    worstTemp: worstTemp === Infinity ? 70 : worstTemp,
    worstFeelsLike: worstFeelsLike === Infinity ? 70 : worstFeelsLike,
    maxWindSpeed,
    hasPrecipitation,
    maxElevationGain: Math.max(0, maxElevationFt - startElevationFt),
  };
}
