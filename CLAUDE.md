@AGENTS.md

# dress-me

Personal weather-based clothing layer recommender. Single-user app. Next.js 16 + TypeScript + Tailwind + Prisma 7 + SQLite + Auth.js v5 (next-auth@beta).

## Critical: breaking-change stack

### Prisma 7

- Connection URL is NOT in `schema.prisma`. It lives in `prisma.config.ts` and is loaded via dotenv.
- `PrismaClient` requires a driver adapter — no bare `new PrismaClient()`. For SQLite, use `@prisma/adapter-better-sqlite3` with `{ url: dbPath }` (not a `Database` instance).
- See `src/lib/prisma.ts` for the singleton pattern.
- Schema datasource has only `provider = "sqlite"` — no `url` field.
- Run `npx prisma migrate dev` to apply schema changes. Run `npx prisma generate` after.

### Next.js 16

- Middleware is `src/proxy.ts`, not `src/middleware.ts`. Same API, different filename.
- `params` in route handlers is a `Promise` — always `await params` before destructuring.
- Read `node_modules/next/dist/docs/` before making routing or middleware changes.

### Auth.js v5 (next-auth@beta)

- Import from `next-auth`, `next-auth/providers/strava`, `@auth/prisma-adapter`.
- `signIn` and `signOut` are called from Server Actions (inline `"use server"` functions).
- `session.user.id` is not exposed by default — the session callback in `src/lib/auth.ts` adds it explicitly.
- TypeScript augmentation for the session type is in `src/types/next-auth.d.ts`.
- Strava returns `profile.id` as an integer, but `Account.providerAccountId` is `String` in Prisma. The `profile` override in `src/lib/auth.ts` coerces it with `String(profile.id)` — do not remove it.

## Architecture

```
src/
├── proxy.ts                        # Auth guard for /api/wardrobe and /api/strava
├── lib/
│   ├── types.ts                    # All shared TypeScript types
│   ├── layering.ts                 # getLayerRecommendation (generic), getWardrobeRecommendation (wardrobe-aware)
│   ├── routePlanning.ts            # sampleWaypoints, applyLapseRate, computeWorstCase — pure, no network
│   ├── prisma.ts                   # PrismaClient singleton (adapter pattern)
│   ├── auth.ts                     # Auth.js v5 config with Strava provider
│   └── strava.ts                   # getStravaToken(userId) — reads Account row, refreshes if expired
├── hooks/
│   └── useGeolocation.ts           # Browser geolocation hook
├── components/
│   ├── Nav.tsx                     # Server component — calls auth(), shows sign in/out
│   ├── ActivityToggle.tsx          # Running / Cycling pill toggle
│   ├── CitySearch.tsx              # City input form
│   ├── WeatherDisplay.tsx          # Current conditions card
│   └── LayerList.tsx               # Ordered layer list with note callouts
└── app/
    ├── page.tsx                    # Home: geolocation → weather → generic layer recommendation
    ├── wardrobe/page.tsx           # Wardrobe CRUD (client component)
    ├── plan/page.tsx               # Strava route planning (client component)
    └── api/
        ├── auth/[...nextauth]/     # Auth.js handler
        ├── weather/route.ts        # Current weather (lat/lon or city)
        ├── weather/forecast/       # OWM 5-day/3-hour forecast, closest entry to ?dt=
        ├── wardrobe/               # GET/POST wardrobe items
        ├── wardrobe/[id]/          # PUT/DELETE individual item
        └── strava/routes/          # GET list + GET streams for a route
```

## Key patterns

**Wardrobe items** — `activities` and `type` are stored as plain strings in SQLite (no arrays/enums). `activities` is JSON-serialized (`'["running","cycling"]'`). Parse on read, stringify on write.

**Layering recommendation fallback** — if wardrobe is empty, `getWardrobeRecommendation` falls back to the generic `getLayerRecommendation` with `isGeneric: true` in the result. The UI should prompt the user to add wardrobe items in that case.

**Strava token refresh** — `getStravaToken` in `src/lib/strava.ts` checks `expires_at` and calls the Strava refresh endpoint if needed. The refreshed tokens are persisted back to the `Account` table.

**Route planning** — `sampleWaypoints` estimates arrival at each point using 14 mph average speed. `computeWorstCase` applies the elevation lapse rate (3.5°F/1000ft) per waypoint before finding the worst-case conditions across the route.

**Auth gates** — `/wardrobe` and `/plan` are protected by layout-level Server Components (`auth()` → `redirect("/")`). API routes `/api/wardrobe` and `/api/strava` are covered by `src/proxy.ts`.

## Env vars

All in `.env.local`:

```
DATABASE_URL=file:./prisma/dev.db
AUTH_SECRET=...
AUTH_STRAVA_ID=...
AUTH_STRAVA_SECRET=...
OPENWEATHERMAP_API_KEY=...
```

`DATABASE_URL` also lives in `.env` so the Prisma CLI (via dotenv in `prisma.config.ts`) can read it without `.env.local`. Both files must use the same path (`file:./prisma/dev.db`) — if they diverge, the CLI migrates a different file than the app reads, and the tables won't exist at runtime.

## Testing

Tests use **Vitest** and live alongside source files as `*.test.ts`.

```bash
npm test               # run all tests once
npm run test:watch     # watch mode
npm run test:coverage  # coverage report
```

**Test patterns:**
- Pure lib functions (`layering.ts`, `routePlanning.ts`): test directly, no mocks needed.
- API route handlers: mock `@/lib/auth` and `@/lib/prisma` via `vi.mock`. Construct `NextRequest` with the standard constructor. Mock global `fetch` with `vi.stubGlobal('fetch', vi.fn())` and restore with `vi.unstubAllGlobals()` in `afterEach`. Call `vi.clearAllMocks()` in `beforeEach` to reset call counts.
- Always write tests alongside any new code.

## Common tasks

```bash
npm run dev              # start dev server
npm run build            # type check + production build
npx prisma studio        # browse/edit the SQLite database in a browser
npx prisma migrate dev   # apply schema changes
npx prisma generate      # regenerate client after schema change
```
