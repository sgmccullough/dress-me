import { WeatherData } from "@/lib/types";

interface Props {
  weather: WeatherData;
}

export default function WeatherDisplay({ weather }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full max-w-sm">
      <p className="text-sm text-gray-500 mb-1">{weather.cityName}</p>
      <div className="flex items-end gap-2 mb-4">
        <span className="text-6xl font-light text-gray-900">
          {Math.round(weather.temp)}°
        </span>
        <span className="text-lg text-gray-500 mb-2">F</span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-400 text-xs mb-1">Feels like</p>
          <p className="font-medium text-gray-700">
            {Math.round(weather.feelsLike)}°F
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-400 text-xs mb-1">Condition</p>
          <p className="font-medium text-gray-700">{weather.condition}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-400 text-xs mb-1">Wind</p>
          <p className="font-medium text-gray-700">
            {Math.round(weather.windSpeed)} mph
          </p>
        </div>
      </div>
    </div>
  );
}
