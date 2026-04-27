import { NextRequest } from "next/server";
import { WeatherData } from "@/lib/types";

const BASE = "https://api.openweathermap.org";

interface OWMForecastEntry {
  dt: number;
  main: { temp: number; feels_like: number };
  weather: Array<{ main: string; id: number }>;
  wind: { speed: number };
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "API key not configured" }, { status: 500 });
  }

  const { searchParams } = request.nextUrl;
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const dt = searchParams.get("dt");

  if (!lat || !lon || !dt) {
    return Response.json(
      { error: "lat, lon, and dt required" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(
      `${BASE}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`,
    );
    if (!res.ok) {
      return Response.json({ error: "Forecast fetch failed" }, { status: 500 });
    }

    const data = await res.json();
    const targetTs = Number(dt);

    const closest = (data.list as OWMForecastEntry[]).reduce((best, entry) =>
      Math.abs(entry.dt - targetTs) < Math.abs(best.dt - targetTs)
        ? entry
        : best,
    );

    const weather: WeatherData = {
      temp: closest.main.temp,
      feelsLike: closest.main.feels_like,
      condition: closest.weather[0].main,
      conditionId: closest.weather[0].id,
      windSpeed: closest.wind.speed,
      cityName: data.city?.name ?? "",
    };

    return Response.json(weather);
  } catch {
    return Response.json({ error: "Forecast fetch failed" }, { status: 500 });
  }
}
