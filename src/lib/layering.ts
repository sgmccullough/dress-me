import {
  Activity,
  ClothingItem,
  ClothingItemType,
  LayerRecommendation,
  RouteConditions,
  WardrobeRecommendation,
  WeatherData,
} from "./types";

type TempBand = "arctic" | "cold" | "cool" | "mild" | "warm";

const runningLayers: Record<TempBand, string[]> = {
  arctic: ["Thermal base layer", "Wind-resistant jacket", "Running tights", "Gloves", "Hat or ear warmers"],
  cold:   ["Long-sleeve moisture-wicking top", "Light jacket", "Running tights", "Light gloves"],
  cool:   ["Long-sleeve tech tee", "Shorts or capris"],
  mild:   ["Short-sleeve tech tee", "Shorts"],
  warm:   ["Tank or short-sleeve tee", "Shorts", "Sunscreen / sun protection"],
};

const cyclingLayers: Record<TempBand, string[]> = {
  arctic: ["Thermal base layer", "Insulated cycling jacket", "Bib tights", "Shoe covers", "Full-finger gloves", "Helmet liner"],
  cold:   ["Long-sleeve base layer", "Cycling jacket", "Bib tights", "Light gloves"],
  cool:   ["Short-sleeve jersey", "Arm warmers", "Bib shorts or knickers"],
  mild:   ["Short-sleeve jersey", "Bib shorts"],
  warm:   ["Short-sleeve jersey", "Shorts", "Sunscreen / sun protection"],
};

const coolNotes: Record<Activity, string> = {
  running: "Optional light layer depending on wind",
  cycling: "Light gloves optional",
};

function getTempBand(temp: number): TempBand {
  if (temp < 32) return "arctic";
  if (temp < 50) return "cold";
  if (temp < 65) return "cool";
  if (temp <= 75) return "mild";
  return "warm";
}

function isPrecipitation(conditionId: number): boolean {
  return conditionId >= 200 && conditionId <= 622;
}

function hasJacket(layers: string[]): boolean {
  return layers.some((l) => l.toLowerCase().includes("jacket"));
}

export function getLayerRecommendation(
  weather: WeatherData,
  activity: Activity
): LayerRecommendation {
  const band = getTempBand(weather.temp);
  const baseLayers = activity === "running" ? runningLayers : cyclingLayers;
  const layers = [...baseLayers[band]];
  const notes: string[] = [];

  if (band === "cool") {
    notes.push(coolNotes[activity]);
  }

  if (weather.windSpeed > 15) {
    const windLayer =
      activity === "running" ? "Wind-resistant outer layer" : "Windproof cycling gilet";
    if (!layers.includes(windLayer)) {
      layers.push(windLayer);
    }
    notes.push(`Wind layer added — ${Math.round(weather.windSpeed)} mph winds`);
  }

  if (isPrecipitation(weather.conditionId) && !hasJacket(layers)) {
    layers.push("Waterproof/rain jacket");
    notes.push("Rain jacket added for current precipitation");
  }

  return { layers, notes };
}

const typeOrder: ClothingItemType[] = [
  "BASE_LAYER",
  "MID_LAYER",
  "OUTER_LAYER",
  "BOTTOMS",
  "ACCESSORIES",
];

export function getWardrobeRecommendation(
  conditions: RouteConditions,
  wardrobe: ClothingItem[],
  activity: Activity
): WardrobeRecommendation {
  if (wardrobe.length === 0) {
    const syntheticWeather: WeatherData = {
      temp: conditions.worstTemp,
      feelsLike: conditions.worstFeelsLike,
      condition: conditions.hasPrecipitation ? "Rain" : "Clear",
      conditionId: conditions.hasPrecipitation ? 500 : 800,
      windSpeed: conditions.maxWindSpeed,
      cityName: "",
    };
    const generic = getLayerRecommendation(syntheticWeather, activity);
    return {
      layers: generic.layers.map((name) => ({ name })),
      notes: generic.notes,
      isGeneric: true,
    };
  }

  const notes: string[] = [];
  const selectedLayers: Array<{ name: string; item: ClothingItem }> = [];

  for (const type of typeOrder) {
    const candidates = wardrobe.filter(
      (item) =>
        item.type === type &&
        item.activities.includes(activity) &&
        conditions.worstFeelsLike >= item.minTemp &&
        conditions.worstFeelsLike <= item.maxTemp
    );

    if (candidates.length === 0) continue;

    const best = candidates.reduce((a, b) => {
      const aMid = (a.minTemp + a.maxTemp) / 2;
      const bMid = (b.minTemp + b.maxTemp) / 2;
      return Math.abs(aMid - conditions.worstFeelsLike) <=
        Math.abs(bMid - conditions.worstFeelsLike)
        ? a
        : b;
    });

    selectedLayers.push({ name: best.name, item: best });
  }

  if (conditions.maxWindSpeed > 15) {
    const hasWindproof = selectedLayers.some((l) => l.item.isWindproof);
    if (!hasWindproof) {
      notes.push(
        `Wind protection needed (${Math.round(conditions.maxWindSpeed)} mph) — no windproof item in wardrobe matches these conditions`
      );
    }
  }

  if (conditions.hasPrecipitation) {
    const hasWaterproof = selectedLayers.some((l) => l.item.isWaterproof);
    if (!hasWaterproof) {
      notes.push(
        "Rain expected — no waterproof item in wardrobe matches these conditions"
      );
    }
  }

  return { layers: selectedLayers, notes, isGeneric: false };
}
