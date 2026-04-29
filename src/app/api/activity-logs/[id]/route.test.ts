import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    activityLog: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { DELETE } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.mocked(auth);
const mockFindFirst = vi.mocked(prisma.activityLog.findFirst);
const mockDelete = vi.mocked(prisma.activityLog.delete);

const AUTHED_SESSION = { user: { id: "user-1" } };

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
};

const PARAMS = Promise.resolve({ id: "log-1" });

function makeRequest() {
  return new NextRequest("http://localhost/api/activity-logs/log-1", {
    method: "DELETE",
  });
}

describe("DELETE /api/activity-logs/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(makeRequest(), { params: PARAMS });
    expect(res.status).toBe(401);
  });

  it("returns 404 when log does not belong to user", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    mockFindFirst.mockResolvedValue(null);
    const res = await DELETE(makeRequest(), { params: PARAMS });
    expect(res.status).toBe(404);
  });

  it("returns 204 on successful delete", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    mockFindFirst.mockResolvedValue(DB_LOG);
    mockDelete.mockResolvedValue(DB_LOG);

    const res = await DELETE(makeRequest(), { params: PARAMS });
    expect(res.status).toBe(204);
  });

  it("queries by id and userId to prevent unauthorized deletion", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    mockFindFirst.mockResolvedValue(DB_LOG);
    mockDelete.mockResolvedValue(DB_LOG);

    await DELETE(makeRequest(), { params: PARAMS });
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: "log-1", userId: "user-1" },
    });
  });

  it("deletes by id only (not scoped by userId)", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    mockFindFirst.mockResolvedValue(DB_LOG);
    mockDelete.mockResolvedValue(DB_LOG);

    await DELETE(makeRequest(), { params: PARAMS });
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "log-1" } });
  });
});
