import { auth } from "@/lib/auth";
import { getStravaToken } from "@/lib/strava";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { accessToken, athleteId } = await getStravaToken(session.user.id);

  const res = await fetch(
    `https://www.strava.com/api/v3/athletes/${athleteId}/routes?per_page=30`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    return Response.json({ error: "Strava request failed" }, { status: 502 });
  }

  // Strava route IDs are 64-bit integers that exceed Number.MAX_SAFE_INTEGER.
  // JSON.parse loses precision for these; quote them as strings before parsing.
  const text = await res.text();
  const safe = text.replace(/"id":(\d{16,})/g, '"id":"$1"');
  return new Response(safe, {
    headers: { "Content-Type": "application/json" },
  });
}
