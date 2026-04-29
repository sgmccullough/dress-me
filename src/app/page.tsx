"use client";

import { useEffect, useMemo, useState } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { getWardrobeRecommendation } from "@/lib/layering";
import {
  Activity,
  ClothingItem,
  RouteConditions,
  WeatherData,
} from "@/lib/types";
import ActivityToggle from "@/components/ActivityToggle";
import CitySearch from "@/components/CitySearch";
import LayerList from "@/components/LayerList";
import WeatherDisplay from "@/components/WeatherDisplay";

export default function Home() {
  const geo = useGeolocation();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [activity, setActivity] = useState<Activity>("cycling");
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [userShowsCitySearch, setUserShowsCitySearch] = useState(false);

  const showCitySearch =
    userShowsCitySearch || (!geo.loading && !geo.coords && !weather);

  useEffect(() => {
    fetch("/api/wardrobe")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setWardrobe(Array.isArray(data) ? data : []));
  }, []);

  async function fetchWeather(
    params: { lat: number; lon: number } | { city: string },
  ) {
    setLoadingWeather(true);
    setWeatherError(null);

    const query =
      "lat" in params
        ? `lat=${params.lat}&lon=${params.lon}`
        : `city=${encodeURIComponent(params.city)}`;

    try {
      const res = await fetch(`/api/weather?${query}`);
      const data = await res.json();
      if (!res.ok) {
        setWeatherError(data.error ?? "Failed to load weather");
      } else {
        setWeather(data);
        setUserShowsCitySearch(false);
      }
    } catch {
      setWeatherError("Failed to load weather");
    } finally {
      setLoadingWeather(false);
    }
  }

  useEffect(() => {
    if (geo.loading || !geo.coords) return;
    const { lat, lon } = geo.coords;
    let cancelled = false;

    fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      .then((res) =>
        res.ok ? res.json() : res.json().then((d) => Promise.reject(d)),
      )
      .then((data) => {
        if (!cancelled) setWeather(data);
      })
      .catch((err) => {
        if (!cancelled) setWeatherError(err?.error ?? "Failed to load weather");
      });

    return () => {
      cancelled = true;
    };
  }, [geo.loading, geo.coords]);

  function handleGeolocate() {
    if (!navigator.geolocation) {
      setWeatherError("Geolocation not supported by this browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchWeather({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (err) => {
        if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
          setWeatherError(
            "Location blocked — click the lock icon in your browser's address bar and allow location, then try again.",
          );
        } else {
          setWeatherError(
            "Could not get your location. Try searching by city.",
          );
        }
      },
    );
  }

  const recommendation = useMemo(() => {
    if (!weather) return null;
    const conditions: RouteConditions = {
      worstTemp: weather.temp,
      worstFeelsLike: weather.feelsLike,
      maxWindSpeed: weather.windSpeed,
      hasPrecipitation:
        weather.conditionId >= 200 && weather.conditionId <= 622,
      maxElevationGain: 0,
    };
    return getWardrobeRecommendation(conditions, wardrobe, activity);
  }, [weather, wardrobe, activity]);

  const layerRec = useMemo(
    () =>
      recommendation
        ? {
            layers: recommendation.layers.map((l) => l.name),
            notes: recommendation.notes,
          }
        : null,
    [recommendation],
  );

  const geoFetchLoading =
    !geo.loading && !!geo.coords && !weather && !weatherError;
  const isInitialLoading = geo.loading || loadingWeather || geoFetchLoading;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-gray-900">dress-me</h1>
          <p className="text-sm text-gray-400 mt-1">
            Sometimes it&apos;s hard to know how to dress yourself.
          </p>
        </div>

        {geo.loading && (
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Detecting location...</p>
          </div>
        )}

        {!geo.loading && isInitialLoading && !showCitySearch && (
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Loading weather...</p>
          </div>
        )}

        {!geo.loading && (showCitySearch || weatherError) && (
          <div className="flex flex-col items-center gap-3 w-full">
            {weatherError && (
              <p className="text-sm text-red-500">{weatherError}</p>
            )}
            {!weatherError && !weather && (
              <p className="text-sm text-gray-500">
                Enter your city to get started
              </p>
            )}
            <CitySearch
              onSearch={(city) => fetchWeather({ city })}
              onGeolocate={handleGeolocate}
              loading={loadingWeather}
            />
          </div>
        )}

        {!isInitialLoading && weather && layerRec && (
          <>
            <WeatherDisplay weather={weather} />
            <ActivityToggle activity={activity} onChange={setActivity} />
            <LayerList recommendation={layerRec} activity={activity} />
            {recommendation?.isGeneric && (
              <p className="text-xs text-gray-400 text-center">
                Add{" "}
                <a href="/wardrobe" className="underline hover:text-gray-600">
                  wardrobe items
                </a>{" "}
                for personalized recommendations.
              </p>
            )}
            <button
              onClick={() => setUserShowsCitySearch((prev) => !prev)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showCitySearch ? "Cancel" : "Change location"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
