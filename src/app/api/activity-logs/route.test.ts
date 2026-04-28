import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    activityLog: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { GET, POST } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.mocked(auth);
const mockFindMany = vi.mocked(prisma.activityLog.findMany);
const mockUpsert = vi.mocked(prisma.activityLog.upsert);

const AUTHED_SESSION = { user: { id: "user-1" } };

const DB_ITEM = {
  id: "ci-1",
  userId: "user-1",
  name: "Thermal Top",
  type: "BASE_LAYER",
  activities: '["running"]',
  minTemp: 20,
  maxTemp: 40,
  isWindproof: false,
  isWaterproof: false,
  notes: null,
  createdAt: new Date(),
};

const DB_LOG = {
  id: "log-1",
  userId: "user-1",
  stravaActivityId: "strava-123",
  activityName: "Morning Run",
  activityDate: new Date("2026-04-01"),
  temperature: 55,
  feelsLike: 52,
  windSpeed: 8,
  createdAt: new Date("2026-04-01"),
  items: [{ clothingItem: DB_ITEM }],
};

function makePostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/activity-logs", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("GET /api/activity-logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns logs with ISO date strings when authenticated", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    mockFindMany.mockResolvedValue([DB_LOG]);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data[0].activityDate).toBe("2026-04-01T00:00:00.000Z");
    expect(data[0].activityName).toBe("Morning Run");
  });

  it("parses activities JSON on each clothing item", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    mockFindMany.mockResolvedValue([DB_LOG]);

    const res = await GET();
    const data = await res.json();
    expect(data[0].items[0].activities).toEqual(["running"]);
  });

  it("queries only the authenticated user's logs", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    mockFindMany.mockResolvedValue([]);

    await GET();
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
      }),
    );
  });
});

describe("POST /api/activity-logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(
      makePostRequest({
        stravaActivityId: "123",
        activityName: "Run",
        activityDate: "2026-04-01",
        clothingItemIds: [],
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when stravaActivityId is missing", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    const res = await POST(
      makePostRequest({
        activityName: "Run",
        activityDate: "2026-04-01",
        clothingItemIds: [],
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when activityName is missing", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    const res = await POST(
      makePostRequest({
        stravaActivityId: "123",
        activityDate: "2026-04-01",
        clothingItemIds: [],
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when activityDate is missing", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    const res = await POST(
      makePostRequest({
        stravaActivityId: "123",
        activityName: "Run",
        clothingItemIds: [],
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when clothingItemIds is not an array", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    const res = await POST(
      makePostRequest({
        stravaActivityId: "123",
        activityName: "Run",
        activityDate: "2026-04-01",
        clothingItemIds: "not-an-array",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("upserts a log and returns 201", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    mockUpsert.mockResolvedValue(DB_LOG);

    const res = await POST(
      makePostRequest({
        stravaActivityId: "strava-123",
        activityName: "Morning Run",
        activityDate: "2026-04-01",
        clothingItemIds: ["ci-1"],
        temperature: 55,
        feelsLike: 52,
        windSpeed: 8,
      }),
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.stravaActivityId).toBe("strava-123");
  });

  it("accepts null weather fields", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    mockUpsert.mockResolvedValue({
      ...DB_LOG,
      temperature: null,
      feelsLike: null,
      windSpeed: null,
    });

    const res = await POST(
      makePostRequest({
        stravaActivityId: "strava-123",
        activityName: "Morning Run",
        activityDate: "2026-04-01",
        clothingItemIds: [],
      }),
    );
    expect(res.status).toBe(201);
  });
});
