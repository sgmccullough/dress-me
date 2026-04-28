import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "./route";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  process.env.OPENWEATHERMAP_API_KEY = "test-key";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.OPENWEATHERMAP_API_KEY;
});

const ENTRY_A = {
  dt: 1700000000,
  main: { temp: 62, feels_like: 59 },
  weather: [{ main: "Clear", id: 800 }],
  wind: { speed: 7 },
};

const ENTRY_B = {
  dt: 1700003600,
  main: { temp: 58, feels_like: 55 },
  weather: [{ main: "Clouds", id: 801 }],
  wind: { speed: 10 },
};

const OWM_FORECAST = {
  list: [ENTRY_A, ENTRY_B],
  city: { name: "Denver" },
};

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/api/weather/forecast");
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

describe("GET /api/weather/forecast", () => {
  it("returns 500 when API key is not configured", async () => {
    delete process.env.OPENWEATHERMAP_API_KEY;
    const res = await GET(
      makeRequest({ lat: "40", lon: "-74", dt: "1700000000" }),
    );
    expect(res.status).toBe(500);
  });

  it("returns 400 when lat is missing", async () => {
    const res = await GET(makeRequest({ lon: "-74", dt: "1700000000" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when lon is missing", async () => {
    const res = await GET(makeRequest({ lat: "40", dt: "1700000000" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when dt is missing", async () => {
    const res = await GET(makeRequest({ lat: "40", lon: "-74" }));
    expect(res.status).toBe(400);
  });

  it("returns the entry closest to the requested dt", async () => {
    mockFetch.mockResolvedValue(okJson(OWM_FORECAST));

    const res = await GET(
      makeRequest({ lat: "40", lon: "-74", dt: String(ENTRY_A.dt) }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.temp).toBe(62);
    expect(data.conditionId).toBe(800);
  });

  it("picks the second entry when dt is closer to it", async () => {
    mockFetch.mockResolvedValue(okJson(OWM_FORECAST));

    const target = ENTRY_B.dt - 100;
    const res = await GET(
      makeRequest({ lat: "40", lon: "-74", dt: String(target) }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.temp).toBe(58);
  });

  it("includes cityName from forecast response", async () => {
    mockFetch.mockResolvedValue(okJson(OWM_FORECAST));

    const res = await GET(
      makeRequest({ lat: "40", lon: "-74", dt: "1700000000" }),
    );
    const data = await res.json();
    expect(data.cityName).toBe("Denver");
  });

  it("returns 500 when OWM fetch fails", async () => {
    mockFetch.mockResolvedValue(new Response("error", { status: 500 }));

    const res = await GET(
      makeRequest({ lat: "40", lon: "-74", dt: "1700000000" }),
    );
    expect(res.status).toBe(500);
  });

  it("returns 500 when fetch throws", async () => {
    mockFetch.mockRejectedValue(new Error("network error"));

    const res = await GET(
      makeRequest({ lat: "40", lon: "-74", dt: "1700000000" }),
    );
    expect(res.status).toBe(500);
  });
});
