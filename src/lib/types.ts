export type Activity = "running" | "cycling";

export interface WeatherData {
  temp: number;
  feelsLike: number;
  condition: string;
  conditionId: number;
  windSpeed: number;
  cityName: string;
}

export interface LayerRecommendation {
  layers: string[];
  notes: string[];
}

export type ClothingItemType =
  | "BASE_LAYER"
  | "MID_LAYER"
  | "OUTER_LAYER"
  | "BOTTOMS"
  | "ACCESSORIES";

export interface ClothingItem {
  id: string;
  userId: string;
  name: string;
  type: ClothingItemType;
  activities: Activity[];
  minTemp: number;
  maxTemp: number;
  isWindproof: boolean;
  isWaterproof: boolean;
  notes?: string | null;
}

export interface RouteConditions {
  worstTemp: number;
  worstFeelsLike: number;
  maxWindSpeed: number;
  hasPrecipitation: boolean;
  maxElevationGain: number;
}

export interface WardrobeRecommendation {
  layers: Array<{ name: string; item?: ClothingItem }>;
  notes: string[];
  isGeneric: boolean;
}

export interface StravaRoute {
  id: number;
  name: string;
  distance: number;
  elevation_gain: number;
  estimated_moving_time: number;
  type: number;
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  distance: number;
  total_elevation_gain: number;
  average_temp?: number;
  moving_time: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  stravaActivityId: string;
  activityName: string;
  activityDate: string;
  temperature?: number | null;
  feelsLike?: number | null;
  windSpeed?: number | null;
  items: ClothingItem[];
  createdAt: string;
}

export interface WaypointForecast {
  lat: number;
  lon: number;
  estimatedArrivalUnix: number;
  elevationFt: number;
  weather: WeatherData;
}

export interface SampledWaypoint {
  lat: number;
  lon: number;
  elevationFt: number;
  estimatedArrivalUnix: number;
}
