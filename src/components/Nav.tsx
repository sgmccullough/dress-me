import Link from "next/link";
import { auth, signIn, signOut } from "@/lib/auth";

export default async function Nav() {
  const session = await auth();

  return (
    <header className="border-b border-gray-100 bg-white">
      <nav className="max-w-sm mx-auto flex items-center justify-between px-4 h-12">
        <div className="flex gap-4 text-sm font-medium">
          <Link
            href="/"
            className="text-gray-700 hover:text-blue-600 transition-colors"
          >
            Home
          </Link>
          {session && (
            <>
              <Link
                href="/wardrobe"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Wardrobe
              </Link>
              <Link
                href="/plan"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Plan
              </Link>
              <Link
                href="/log"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Log
              </Link>
            </>
          )}
        </div>
        <div className="text-sm">
          {session ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                Sign out
              </button>
            </form>
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn("strava");
              }}
            >
              <button
                type="submit"
                className="text-blue-600 font-medium hover:text-blue-700 transition-colors"
              >
                Connect Strava
              </button>
            </form>
          )}
        </div>
      </nav>
    </header>
  );
}
