"use server";

import { signIn } from "@/lib/auth";

export async function connectStrava() {
  await signIn("strava");
}
