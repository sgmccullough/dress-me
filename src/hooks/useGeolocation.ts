"use client";

import { useState, useEffect } from "react";

interface GeolocationResult {
  coords: { lat: number; lon: number } | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation(): GeolocationResult {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      Promise.resolve().then(() => {
        setError("Geolocation not supported by this browser");
        setLoading(false);
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        setError(
          err.code === GeolocationPositionError.PERMISSION_DENIED
            ? "Location blocked — click the lock icon in your browser's address bar and allow location, then try again."
            : "Could not get your location. Try searching by city.",
        );
        setLoading(false);
      },
    );
  }, []);

  return { coords, error, loading };
}
