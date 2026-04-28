import { describe, it, expect } from "vitest";
import { applyLapseRate, sampleWaypoints, computeWorstCase } from "./routePlanning";
import type { WaypointForecast } from "./types";

function makeWeather(overrides = {}) {
  return {
    temp: 60,
    feelsLike: 58,
    condition: "Clear",
    conditionId: 800,
    windSpeed: 5,
    cityName: "",
    ...overrides,
  };
}

function makeStreams(
  points: Array<[number, number]>,
  altMeters: number[],
  distMeters: number[],
) {
  return [
    { type: "latlng", data: points },
    { type: "altitude", data: altMeters },
    { type: "distance", data: distMeters },
  ];
}

describe("applyLapseRate", () => {
  it("returns same temp when elevation gain is 0", () => {
    expect(applyLapseRate(60, 0)).toBe(60);
  });

  it("reduces temp by 3.5°F per 1000ft of gain", () => {
    expect(applyLapseRate(60, 1000)).toBe(56.5);
  });

  it("applies proportionally for partial thousands", () => {
    expect(applyLapseRate(60, 500)).toBe(58.25);
  });

  it("applies for large elevation gains", () => {
    expect(applyLapseRate(60, 5000)).toBeCloseTo(42.5);
  });
});

describe("sampleWaypoints", () => {
  it("throws when latlng stream is missing", () => {
    const streams = [
      { type: "altitude", data: [100] },
      { type: "distance", data: [0] },
    ];
    expect(() => sampleWaypoints(streams, 0)).toThrow("Required streams");
  });

  it("throws when altitude stream is missing", () => {
    const streams = [
      { type: "latlng", data: [[40, -74]] },
      { type: "distance", data: [0] },
    ];
    expect(() => sampleWaypoints(streams, 0)).toThrow("Required streams");
  });

  it("throws when distance stream is missing", () => {
    const streams = [
      { type: "latlng", data: [[40, -74]] },
      { type: "altitude", data: [100] },
    ];
    expect(() => sampleWaypoints(streams, 0)).toThrow("Required streams");
  });

  it("returns the requested number of waypoints (default 5)", () => {
    const n = 10;
    const points: [number, number][] = Array.from({ length: n }, (_, i) => [
      40 + i * 0.01,
      -74,
    ]);
    const alts = Array.from({ length: n }, () => 100);
    const dists = Array.from({ length: n }, (_, i) => i * 1000);
    const streams = makeStreams(points, alts, dists);
    const result = sampleWaypoints(streams, 1000000000);
    expect(result.length).toBe(5);
  });

  it("respects a custom sampleCount", () => {
    const n = 20;
    const points: [number, number][] = Array.from({ length: n }, (_, i) => [
      40 + i * 0.01,
      -74,
    ]);
    const alts = Array.from({ length: n }, () => 100);
    const dists = Array.from({ length: n }, (_, i) => i * 1000);
    const streams = makeStreams(points, alts, dists);
    const result = sampleWaypoints(streams, 1000000000, 8);
    expect(result.length).toBe(8);
  });

  it("enforces a minimum of 3 waypoints even when sampleCount < 3", () => {
    const points: [number, number][] = [
      [40, -74],
      [41, -74],
      [42, -74],
    ];
    const streams = makeStreams(points, [100, 100, 100], [0, 1000, 2000]);
    const result = sampleWaypoints(streams, 0, 1);
    expect(result.length).toBe(3);
  });

  it("first waypoint is at departure time", () => {
    const points: [number, number][] = [
      [40, -74],
      [41, -74],
      [42, -74],
    ];
    const streams = makeStreams(points, [100, 100, 100], [0, 1000, 2000]);
    const departure = 1700000000;
    const result = sampleWaypoints(streams, departure);
    expect(result[0].estimatedArrivalUnix).toBe(departure);
  });

  it("converts altitude from meters to feet", () => {
    const points: [number, number][] = [
      [40, -74],
      [41, -74],
      [42, -74],
    ];
    const streams = makeStreams(points, [100, 200, 300], [0, 1000, 2000]);
    const result = sampleWaypoints(streams, 0);
    expect(result[0].elevationFt).toBeCloseTo(100 * 3.28084, 2);
  });

  it("includes lat and lon from latlng stream", () => {
    const points: [number, number][] = [
      [40.1, -74.1],
      [41.1, -74.2],
      [42.1, -74.3],
    ];
    const streams = makeStreams(points, [100, 100, 100], [0, 1000, 2000]);
    const result = sampleWaypoints(streams, 0);
    expect(result[0].lat).toBe(40.1);
    expect(result[0].lon).toBe(-74.1);
  });
});

describe("computeWorstCase", () => {
  it("returns default 70°F when waypoints array is empty", () => {
    const result = computeWorstCase([], 0);
    expect(result.worstTemp).toBe(70);
    expect(result.worstFeelsLike).toBe(70);
    expect(result.maxWindSpeed).toBe(0);
    expect(result.hasPrecipitation).toBe(false);
    expect(result.maxElevationGain).toBe(0);
  });

  it("returns adjusted feelsLike accounting for elevation gain", () => {
    const wp: WaypointForecast = {
      lat: 40,
      lon: -74,
      estimatedArrivalUnix: 0,
      elevationFt: 1000,
      weather: makeWeather({ feelsLike: 60, temp: 60 }),
    };
    const result = computeWorstCase([wp], 0);
    expect(result.worstFeelsLike).toBeCloseTo(56.5);
  });

  it("tracks the worst (coldest) feelsLike across waypoints", () => {
    const waypoints: WaypointForecast[] = [
      { lat: 40, lon: -74, estimatedArrivalUnix: 0, elevationFt: 0, weather: makeWeather({ feelsLike: 55 }) },
      { lat: 41, lon: -74, estimatedArrivalUnix: 100, elevationFt: 0, weather: makeWeather({ feelsLike: 40 }) },
      { lat: 42, lon: -74, estimatedArrivalUnix: 200, elevationFt: 0, weather: makeWeather({ feelsLike: 50 }) },
    ];
    const result = computeWorstCase(waypoints, 0);
    expect(result.worstFeelsLike).toBe(40);
  });

  it("tracks the max wind speed", () => {
    const waypoints: WaypointForecast[] = [
      { lat: 40, lon: -74, estimatedArrivalUnix: 0, elevationFt: 0, weather: makeWeather({ windSpeed: 5 }) },
      { lat: 41, lon: -74, estimatedArrivalUnix: 100, elevationFt: 0, weather: makeWeather({ windSpeed: 25 }) },
      { lat: 42, lon: -74, estimatedArrivalUnix: 200, elevationFt: 0, weather: makeWeather({ windSpeed: 10 }) },
    ];
    const result = computeWorstCase(waypoints, 0);
    expect(result.maxWindSpeed).toBe(25);
  });

  it("sets hasPrecipitation when conditionId is in 200-622 range", () => {
    const waypoints: WaypointForecast[] = [
      { lat: 40, lon: -74, estimatedArrivalUnix: 0, elevationFt: 0, weather: makeWeather({ conditionId: 500 }) },
    ];
    const result = computeWorstCase(waypoints, 0);
    expect(result.hasPrecipitation).toBe(true);
  });

  it("does not set hasPrecipitation for conditionId 800 (clear)", () => {
    const waypoints: WaypointForecast[] = [
      { lat: 40, lon: -74, estimatedArrivalUnix: 0, elevationFt: 0, weather: makeWeather({ conditionId: 800 }) },
    ];
    const result = computeWorstCase(waypoints, 0);
    expect(result.hasPrecipitation).toBe(false);
  });

  it("sets hasPrecipitation if any waypoint has precipitation", () => {
    const waypoints: WaypointForecast[] = [
      { lat: 40, lon: -74, estimatedArrivalUnix: 0, elevationFt: 0, weather: makeWeather({ conditionId: 800 }) },
      { lat: 41, lon: -74, estimatedArrivalUnix: 100, elevationFt: 0, weather: makeWeather({ conditionId: 501 }) },
    ];
    const result = computeWorstCase(waypoints, 0);
    expect(result.hasPrecipitation).toBe(true);
  });

  it("computes maxElevationGain relative to startElevationFt", () => {
    const waypoints: WaypointForecast[] = [
      { lat: 40, lon: -74, estimatedArrivalUnix: 0, elevationFt: 100, weather: makeWeather() },
      { lat: 41, lon: -74, estimatedArrivalUnix: 100, elevationFt: 2000, weather: makeWeather() },
      { lat: 42, lon: -74, estimatedArrivalUnix: 200, elevationFt: 500, weather: makeWeather() },
    ];
    const result = computeWorstCase(waypoints, 100);
    expect(result.maxElevationGain).toBe(1900);
  });

  it("does not count negative elevation as gain", () => {
    const waypoints: WaypointForecast[] = [
      { lat: 40, lon: -74, estimatedArrivalUnix: 0, elevationFt: 500, weather: makeWeather() },
    ];
    const result = computeWorstCase(waypoints, 1000);
    expect(result.maxElevationGain).toBe(0);
  });

  it("does not apply lapse rate penalty for waypoints below start elevation", () => {
    const wp: WaypointForecast = {
      lat: 40,
      lon: -74,
      estimatedArrivalUnix: 0,
      elevationFt: 500,
      weather: makeWeather({ feelsLike: 60 }),
    };
    const result = computeWorstCase([wp], 1000);
    expect(result.worstFeelsLike).toBe(60);
  });
});
