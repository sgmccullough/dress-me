import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Activity } from "@/lib/types";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logs = await prisma.activityLog.findMany({
    where: { userId: session.user.id },
    include: {
      items: {
        include: { clothingItem: true },
      },
    },
    orderBy: { activityDate: "desc" },
  });

  return Response.json(
    logs.map((log) => ({
      ...log,
      activityDate: log.activityDate.toISOString(),
      createdAt: log.createdAt.toISOString(),
      items: log.items.map((li) => ({
        ...li.clothingItem,
        activities: JSON.parse(li.clothingItem.activities) as Activity[],
      })),
    })),
  );
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { stravaActivityId, activityName, activityDate, clothingItemIds, temperature, feelsLike, windSpeed } = body;

  if (!stravaActivityId || !activityName || !activityDate || !Array.isArray(clothingItemIds)) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const log = await prisma.activityLog.upsert({
    where: { userId_stravaActivityId: { userId: session.user.id, stravaActivityId: String(stravaActivityId) } },
    create: {
      userId: session.user.id,
      stravaActivityId: String(stravaActivityId),
      activityName: String(activityName),
      activityDate: new Date(activityDate),
      temperature: temperature != null ? Number(temperature) : null,
      feelsLike: feelsLike != null ? Number(feelsLike) : null,
      windSpeed: windSpeed != null ? Number(windSpeed) : null,
      items: {
        create: clothingItemIds.map((id: string) => ({ clothingItemId: id })),
      },
    },
    update: {
      activityName: String(activityName),
      activityDate: new Date(activityDate),
      temperature: temperature != null ? Number(temperature) : null,
      feelsLike: feelsLike != null ? Number(feelsLike) : null,
      windSpeed: windSpeed != null ? Number(windSpeed) : null,
      items: {
        deleteMany: {},
        create: clothingItemIds.map((id: string) => ({ clothingItemId: id })),
      },
    },
    include: {
      items: { include: { clothingItem: true } },
    },
  });

  return Response.json(
    {
      ...log,
      activityDate: log.activityDate.toISOString(),
      createdAt: log.createdAt.toISOString(),
      items: log.items.map((li) => ({
        ...li.clothingItem,
        activities: JSON.parse(li.clothingItem.activities) as Activity[],
      })),
    },
    { status: 201 },
  );
}
