import { NextRequest, NextResponse } from "next/server";
import { WeatherData } from "@/lib/types";

const BASE = "https://api.openweathermap.org";

export async function GET(request: NextRequest) {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const { searchParams } = request.nextUrl;
  let lat: string | null = searchParams.get("lat");
  let lon: string | null = searchParams.get("lon");
  const city = searchParams.get("city");

  try {
    if (city) {
      const geoRes = await fetch(
        `${BASE}/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`
      );
      const geoData = await geoRes.json();
      if (!Array.isArray(geoData) || geoData.length === 0) {
        return NextResponse.json({ error: "City not found" }, { status: 400 });
      }
      lat = String(geoData[0].lat);
      lon = String(geoData[0].lon);
    }

    if (!lat || !lon) {
      return NextResponse.json({ error: "lat/lon or city required" }, { status: 400 });
    }

    const weatherRes = await fetch(
      `${BASE}/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`
    );
    if (!weatherRes.ok) {
      return NextResponse.json({ error: "Weather fetch failed" }, { status: 500 });
    }
    const raw = await weatherRes.json();

    const data: WeatherData = {
      temp: raw.main.temp,
      feelsLike: raw.main.feels_like,
      condition: raw.weather[0].main,
      conditionId: raw.weather[0].id,
      windSpeed: raw.wind.speed,
      cityName: raw.name,
    };

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Weather fetch failed" }, { status: 500 });
  }
}
