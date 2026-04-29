import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClothingItemType, Activity } from "@/lib/types";

const VALID_TYPES: ClothingItemType[] = [
  "BASE_LAYER",
  "MID_LAYER",
  "OUTER_LAYER",
  "BOTTOMS",
  "ACCESSORIES",
];
const VALID_ACTIVITIES: Activity[] = ["running", "cycling"];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.clothingItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  return Response.json(
    items.map((item) => ({
      ...item,
      activities: JSON.parse(item.activities) as Activity[],
    })),
  );
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    name,
    type,
    activities,
    minTemp,
    maxTemp,
    isWindproof,
    isWaterproof,
    notes,
  } = body;

  if (
    !name ||
    !VALID_TYPES.includes(type) ||
    !Array.isArray(activities) ||
    activities.length === 0 ||
    activities.some((a: string) => !VALID_ACTIVITIES.includes(a as Activity))
  ) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const item = await prisma.clothingItem.create({
    data: {
      userId: session.user.id,
      name: String(name),
      type: String(type),
      activities: JSON.stringify(activities),
      minTemp: Number(minTemp),
      maxTemp: Number(maxTemp),
      isWindproof: Boolean(isWindproof),
      isWaterproof: Boolean(isWaterproof),
      notes: notes ? String(notes) : null,
    },
  });

  return Response.json({ ...item, activities }, { status: 201 });
}
