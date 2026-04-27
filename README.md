# dress-me

Sometimes its hard to know how to dress yourself.

A personal weather-based clothing layer recommender for running and cycling. Detects your location, fetches current conditions, and tells you what to wear — from your own wardrobe. Connect Strava to plan future rides based on forecast conditions along the route.

## First-time setup

### 1. API keys

You need two API keys. Add them to a `.env.local` file in the project root (create it if it doesn't exist):

```
OPENWEATHERMAP_API_KEY=your_key_here
AUTH_SECRET=run_command_below
AUTH_STRAVA_ID=your_strava_client_id
AUTH_STRAVA_SECRET=your_strava_client_secret
DATABASE_URL=file:./prisma/dev.db
```

- **OpenWeatherMap** — free account at [openweathermap.org/api](https://openweathermap.org/api). The free "Current Weather" + "5-day forecast" tier is all you need.
- **AUTH_SECRET** — generate one with: `openssl rand -base64 32`
- **Strava** — create an app at [strava.com/settings/api](https://www.strava.com/settings/api). Set the Authorization Callback Domain to `localhost`. The redirect URI Auth.js uses is `http://localhost:3000/api/auth/callback/strava`.

### 2. Initialize the database

```bash
npm install
npx prisma migrate dev
```

This creates `prisma/dev.db`.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Features

### Home

- Auto-detects your location via browser geolocation
- Falls back to city name search if location is denied
- Toggle between Running and Cycling — layer list updates instantly
- "Change location" lets you switch cities without losing the current display

### Wardrobe (`/wardrobe`)

Add your actual gear. Each item has:
- **Name** — e.g. "Patagonia Nano Puff"
- **Type** — Base Layer, Mid Layer, Outer Layer, Bottoms, or Accessories
- **Activities** — Running, Cycling, or both
- **Temp range** — the °F range this item is appropriate for
- **Windproof / Waterproof** flags — used to fill coverage gaps in recommendations
- **Notes** — optional

Once your wardrobe has items, the app recommends from your actual gear instead of generic layer names. If conditions require wind or rain protection and nothing in your wardrobe covers it, you get a warning note.

### Plan (`/plan`)

Requires Strava to be connected (click "Connect Strava" in the nav).

1. Pick one of your saved Strava routes from the dropdown
2. Set a departure time
3. Hit "Plan this ride"

The app samples 5 points along the route, fetches the weather forecast for each at your estimated arrival time (assumes ~14 mph avg speed), applies elevation lapse rate adjustments (~3.5°F per 1000ft gain), and recommends layers against the worst-case conditions across the whole route.

Note: OWM's free forecast only covers 5 days out. Departures further than 5 days will use the furthest available forecast data.

---

## Database management

```bash
npx prisma studio        # browse and edit data in a browser UI
npx prisma migrate dev   # apply schema changes during development
```

## Deployment

Not currently set up for production deployment. To deploy, you would need to replace the SQLite database with a server-based one (Postgres, etc.) and update `prisma.config.ts` and `src/lib/prisma.ts` accordingly.
