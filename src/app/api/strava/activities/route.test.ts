import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/strava", () => ({ getStravaToken: vi.fn() }));

import { GET } from "./route";
import { auth } from "@/lib/auth";
import { getStravaToken } from "@/lib/strava";

const mockAuth = vi.mocked(auth);
const mockGetStravaToken = vi.mocked(getStravaToken);
const mockFetch = vi.fn();

const AUTHED_SESSION = { user: { id: "user-1" } };

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const ACTIVITIES = [
  { id: 1, name: "Morning Run", type: "Run" },
  { id: 2, name: "Afternoon Ride", type: "Ride" },
];

describe("GET /api/strava/activities", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns activities from Strava on success", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    mockGetStravaToken.mockResolvedValue({
      accessToken: "valid-token",
      expiresAt: 9999999999,
    });
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(ACTIVITIES), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe("Morning Run");
  });

  it("passes the access token as a Bearer header", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    mockGetStravaToken.mockResolvedValue({
      accessToken: "abc-token",
      expiresAt: 9999999999,
    });
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    await GET();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("strava.com"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer abc-token",
        }),
      }),
    );
  });

  it("returns 502 when Strava API returns a non-ok status", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    mockGetStravaToken.mockResolvedValue({
      accessToken: "valid-token",
      expiresAt: 9999999999,
    });
    mockFetch.mockResolvedValue(new Response("Forbidden", { status: 403 }));

    const res = await GET();
    expect(res.status).toBe(502);
  });
});
