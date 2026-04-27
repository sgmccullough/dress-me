import { prisma } from "@/lib/prisma";

interface StravaToken {
  accessToken: string;
  athleteId: string;
}

export async function getStravaToken(userId: string): Promise<StravaToken> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "strava" },
  });

  if (!account?.access_token) {
    throw new Error("No Strava account linked");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const isExpired = account.expires_at != null && account.expires_at < nowSec;

  if (!isExpired) {
    return {
      accessToken: account.access_token,
      athleteId: account.providerAccountId,
    };
  }

  if (!account.refresh_token) {
    throw new Error("No Strava refresh token available");
  }

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_STRAVA_ID!,
      client_secret: process.env.AUTH_STRAVA_SECRET!,
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });

  if (!res.ok) throw new Error("Strava token refresh failed");

  const refreshed = await res.json();

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: refreshed.expires_at,
    },
  });

  return {
    accessToken: refreshed.access_token,
    athleteId: account.providerAccountId,
  };
}
