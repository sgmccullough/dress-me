import { auth } from "@/lib/auth";

export default auth((req) => {
  if (!req.auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
});

export const config = {
  matcher: [
    "/api/wardrobe/:path*",
    "/api/strava/:path*",
  ],
};
