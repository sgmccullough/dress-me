import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    clothingItem: {
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { PUT, DELETE } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.mocked(auth);
const mockFindFirst = vi.mocked(prisma.clothingItem.findFirst);
const mockUpdate = vi.mocked(prisma.clothingItem.update);
const mockDelete = vi.mocked(prisma.clothingItem.delete);

const AUTHED_SESSION = { user: { id: "user-1" } };

const DB_ITEM = {
  id: "item-1",
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

const PARAMS = Promise.resolve({ id: "item-1" });

function makeRequest(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/wardrobe/item-1", {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "content-type": "application/json" } : undefined,
  });
}

describe("PUT /api/wardrobe/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PUT(makeRequest("PUT", { name: "Updated" }), {
      params: PARAMS,
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when item does not belong to user", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    mockFindFirst.mockResolvedValue(null);
    const res = await PUT(makeRequest("PUT", { name: "Updated" }), {
      params: PARAMS,
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 with updated item on success", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    mockFindFirst.mockResolvedValue(DB_ITEM);
    mockUpdate.mockResolvedValue({ ...DB_ITEM, name: "Updated" });

    const res = await PUT(makeRequest("PUT", { name: "Updated" }), {
      params: PARAMS,
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("Updated");
    expect(data.activities).toEqual(["running"]);
  });

  it("JSON-stringifies activities on update when provided", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    mockFindFirst.mockResolvedValue(DB_ITEM);
    mockUpdate.mockResolvedValue({
      ...DB_ITEM,
      activities: '["running","cycling"]',
    });

    await PUT(makeRequest("PUT", { activities: ["running", "cycling"] }), {
      params: PARAMS,
    });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          activities: '["running","cycling"]',
        }),
      }),
    );
  });
});

describe("DELETE /api/wardrobe/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE"), { params: PARAMS });
    expect(res.status).toBe(401);
  });

  it("returns 404 when item does not belong to user", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    mockFindFirst.mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE"), { params: PARAMS });
    expect(res.status).toBe(404);
  });

  it("returns 204 on successful delete", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    mockFindFirst.mockResolvedValue(DB_ITEM);
    mockDelete.mockResolvedValue(DB_ITEM);

    const res = await DELETE(makeRequest("DELETE"), { params: PARAMS });
    expect(res.status).toBe(204);
  });

  it("deletes by id", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    mockFindFirst.mockResolvedValue(DB_ITEM);
    mockDelete.mockResolvedValue(DB_ITEM);

    await DELETE(makeRequest("DELETE"), { params: PARAMS });
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "item-1" } });
  });
});
