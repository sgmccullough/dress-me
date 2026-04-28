import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "./route";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
  process.env.OPENWEATHERMAP_API_KEY = "test-key";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.OPENWEATHERMAP_API_KEY;
});

const OWM_RESPONSE = {
  main: { temp: 62, feels_like: 59 },
  weather: [{ main: "Clear", id: 800 }],
  wind: { speed: 7 },
  name: "Denver",
};

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/api/weather");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

function okJson(body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("GET /api/weather", () => {
  it("returns 500 when API key is not configured", async () => {
    delete process.env.OPENWEATHERMAP_API_KEY;
    const res = await GET(makeRequest({ lat: "40", lon: "-74" }));
    expect(res.status).toBe(500);
  });

  it("returns 400 when no params are provided", async () => {
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns weather data for lat/lon params", async () => {
    mockFetch.mockResolvedValue(okJson(OWM_RESPONSE));

    const res = await GET(makeRequest({ lat: "39.7", lon: "-104.9" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.temp).toBe(62);
    expect(data.cityName).toBe("Denver");
    expect(data.conditionId).toBe(800);
  });

  it("resolves city to lat/lon then fetches weather", async () => {
    const geoData = [{ lat: 39.7, lon: -104.9 }];
    mockFetch
      .mockResolvedValueOnce(okJson(geoData))
      .mockResolvedValueOnce(okJson(OWM_RESPONSE));

    const res = await GET(makeRequest({ city: "Denver" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.cityName).toBe("Denver");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("returns 400 when city is not found (empty geocode result)", async () => {
    mockFetch.mockResolvedValue(okJson([]));

    const res = await GET(makeRequest({ city: "Nowhere" }));
    expect(res.status).toBe(400);
  });

  it("returns 500 when weather fetch fails", async () => {
    mockFetch.mockResolvedValue(new Response("error", { status: 500 }));

    const res = await GET(makeRequest({ lat: "40", lon: "-74" }));
    expect(res.status).toBe(500);
  });

  it("returns 500 when fetch throws", async () => {
    mockFetch.mockRejectedValue(new Error("network error"));

    const res = await GET(makeRequest({ lat: "40", lon: "-74" }));
    expect(res.status).toBe(500);
  });
});
