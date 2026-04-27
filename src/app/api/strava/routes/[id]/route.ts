import { auth } from "@/lib/auth";
import { getStravaToken } from "@/lib/strava";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { accessToken } = await getStravaToken(session.user.id);

  const res = await fetch(
    `https://www.strava.com/api/v3/routes/${id}/streams`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    return Response.json({ error: "Strava request failed" }, { status: 502 });
  }

  return Response.json(await res.json());
}
