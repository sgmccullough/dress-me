import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    clothingItem: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.mocked(auth);
const mockFindMany = vi.mocked(prisma.clothingItem.findMany);
const mockCreate = vi.mocked(prisma.clothingItem.create);

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

function makePostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/wardrobe", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("GET /api/wardrobe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns items with parsed activities when authenticated", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    mockFindMany.mockResolvedValue([DB_ITEM]);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data[0].activities).toEqual(["running"]);
    expect(data[0].name).toBe("Thermal Top");
  });

  it("queries only the authenticated user's items", async () => {
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

describe("POST /api/wardrobe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makePostRequest({ name: "Top", type: "BASE_LAYER", activities: ["running"] }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    const res = await POST(
      makePostRequest({ type: "BASE_LAYER", activities: ["running"] }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid type", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    const res = await POST(
      makePostRequest({ name: "Top", type: "INVALID_TYPE", activities: ["running"] }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when activities is empty array", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    const res = await POST(
      makePostRequest({ name: "Top", type: "BASE_LAYER", activities: [] }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid activity value", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    const res = await POST(
      makePostRequest({ name: "Top", type: "BASE_LAYER", activities: ["swimming"] }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when activities is not an array", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    const res = await POST(
      makePostRequest({ name: "Top", type: "BASE_LAYER", activities: "running" }),
    );
    expect(res.status).toBe(400);
  });

  it("creates item and returns 201 with parsed activities", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    mockCreate.mockResolvedValue(DB_ITEM);

    const body = {
      name: "Thermal Top",
      type: "BASE_LAYER",
      activities: ["running"],
      minTemp: 20,
      maxTemp: 40,
      isWindproof: false,
      isWaterproof: false,
    };
    const res = await POST(makePostRequest(body));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.activities).toEqual(["running"]);
  });

  it("stores activities as JSON string in the database", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    mockCreate.mockResolvedValue(DB_ITEM);

    const body = {
      name: "Thermal Top",
      type: "BASE_LAYER",
      activities: ["running", "cycling"],
      minTemp: 20,
      maxTemp: 40,
    };
    await POST(makePostRequest(body));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          activities: '["running","cycling"]',
        }),
      }),
    );
  });
});
