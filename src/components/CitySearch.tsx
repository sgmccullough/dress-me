"use client";

import { useState, FormEvent } from "react";

interface Props {
  onSearch: (city: string) => void;
  onGeolocate?: () => void;
  loading: boolean;
}

export default function CitySearch({ onSearch, onGeolocate, loading }: Props) {
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onSearch(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-sm">
      <div className="relative flex-1">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter a city name"
          className="w-full px-4 py-2 pr-9 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        {onGeolocate && (
          <button
            type="button"
            onClick={onGeolocate}
            disabled={loading}
            title="Use my location"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 disabled:opacity-40 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              width="16"
              height="16"
            >
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
          </button>
        )}
      </div>
      <button
        type="submit"
        disabled={loading || !value.trim()}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
      >
        {loading ? "Loading..." : "Go"}
      </button>
    </form>
  );
}
