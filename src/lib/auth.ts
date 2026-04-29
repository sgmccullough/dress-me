import NextAuth from "next-auth";
import Strava from "next-auth/providers/strava";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Strava({
      authorization: {
        params: {
          scope: "read,activity:read,profile:read_all",
        },
      },
      profile(profile) {
        return {
          id: String(profile.id),
          name: `${profile.firstname} ${profile.lastname}`,
          email: null,
          image: profile.profile as string,
        };
      },
    }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
