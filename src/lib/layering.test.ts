import { describe, it, expect } from "vitest";
import { getLayerRecommendation, getWardrobeRecommendation } from "./layering";
import type { WeatherData, ClothingItem, RouteConditions } from "./types";

function makeWeather(overrides: Partial<WeatherData> = {}): WeatherData {
  return {
    temp: 60,
    feelsLike: 58,
    condition: "Clear",
    conditionId: 800,
    windSpeed: 5,
    cityName: "Denver",
    ...overrides,
  };
}

function makeConditions(
  overrides: Partial<RouteConditions> = {},
): RouteConditions {
  return {
    worstTemp: 60,
    worstFeelsLike: 58,
    maxWindSpeed: 5,
    hasPrecipitation: false,
    maxElevationGain: 0,
    ...overrides,
  };
}

function makeItem(overrides: Partial<ClothingItem> = {}): ClothingItem {
  return {
    id: "1",
    userId: "user-1",
    name: "Base Layer",
    type: "BASE_LAYER",
    activities: ["running"],
    minTemp: 40,
    maxTemp: 70,
    isWindproof: false,
    isWaterproof: false,
    ...overrides,
  };
}

describe("getLayerRecommendation", () => {
  describe("temperature bands", () => {
    it("returns arctic layers for temp < 32", () => {
      const result = getLayerRecommendation(
        makeWeather({ temp: 20 }),
        "running",
      );
      expect(result.layers).toContain("Thermal base layer");
      expect(result.layers).toContain("Running tights");
    });

    it("returns cold layers for 32 <= temp < 50", () => {
      const result = getLayerRecommendation(
        makeWeather({ temp: 40 }),
        "running",
      );
      expect(result.layers).toContain("Long-sleeve moisture-wicking top");
      expect(result.layers).toContain("Running tights");
    });

    it("returns cool layers for 50 <= temp < 65", () => {
      const result = getLayerRecommendation(
        makeWeather({ temp: 55 }),
        "running",
      );
      expect(result.layers).toContain("Long-sleeve tech tee");
      expect(result.notes).toContain("Optional light layer depending on wind");
    });

    it("returns mild layers for 65 <= temp <= 75", () => {
      const result = getLayerRecommendation(
        makeWeather({ temp: 70 }),
        "running",
      );
      expect(result.layers).toContain("Short-sleeve tech tee");
      expect(result.layers).toContain("Shorts");
    });

    it("returns warm layers for temp > 75", () => {
      const result = getLayerRecommendation(
        makeWeather({ temp: 80 }),
        "running",
      );
      expect(result.layers).toContain("Shorts");
      expect(result.layers).toContain("Sunscreen / sun protection");
    });

    it("uses 32 as the boundary: temp=31 is arctic, temp=32 is cold", () => {
      const arctic = getLayerRecommendation(
        makeWeather({ temp: 31 }),
        "running",
      );
      const cold = getLayerRecommendation(makeWeather({ temp: 32 }), "running");
      expect(arctic.layers).toContain("Thermal base layer");
      expect(cold.layers).toContain("Long-sleeve moisture-wicking top");
    });
  });

  describe("activity differences", () => {
    it("returns running layers for running", () => {
      const result = getLayerRecommendation(
        makeWeather({ temp: 40 }),
        "running",
      );
      expect(result.layers).toContain("Running tights");
    });

    it("returns cycling layers for cycling", () => {
      const result = getLayerRecommendation(
        makeWeather({ temp: 40 }),
        "cycling",
      );
      expect(result.layers).toContain("Bib tights");
    });

    it("cycling cool adds gloves note", () => {
      const result = getLayerRecommendation(
        makeWeather({ temp: 55 }),
        "cycling",
      );
      expect(result.notes).toContain("Light gloves optional");
    });
  });

  describe("wind handling", () => {
    it("adds wind layer for running when wind > 15mph", () => {
      const result = getLayerRecommendation(
        makeWeather({ temp: 60, windSpeed: 20 }),
        "running",
      );
      expect(result.layers).toContain("Wind-resistant outer layer");
      expect(result.notes.some((n) => n.includes("20 mph winds"))).toBe(true);
    });

    it("adds wind layer for cycling when wind > 15mph", () => {
      const result = getLayerRecommendation(
        makeWeather({ temp: 60, windSpeed: 20 }),
        "cycling",
      );
      expect(result.layers).toContain("Windproof cycling gilet");
    });

    it("does not add wind layer at exactly 15mph", () => {
      const result = getLayerRecommendation(
        makeWeather({ temp: 60, windSpeed: 15 }),
        "running",
      );
      expect(result.layers).not.toContain("Wind-resistant outer layer");
    });

    it("does not add wind layer when wind <= 15mph", () => {
      const result = getLayerRecommendation(
        makeWeather({ temp: 60, windSpeed: 10 }),
        "running",
      );
      expect(result.layers).not.toContain("Wind-resistant outer layer");
      expect(result.notes.some((n) => n.includes("mph winds"))).toBe(false);
    });

    it("does not duplicate wind layer if already in layers", () => {
      const result = getLayerRecommendation(
        makeWeather({ temp: 60, windSpeed: 20 }),
        "running",
      );
      const count = result.layers.filter(
        (l) => l === "Wind-resistant outer layer",
      ).length;
      expect(count).toBe(1);
    });
  });

  describe("precipitation handling", () => {
    it("adds rain jacket for precipitation when no jacket in layers (cool band)", () => {
      const result = getLayerRecommendation(
        makeWeather({ temp: 60, conditionId: 500 }),
        "running",
      );
      expect(result.layers).toContain("Waterproof/rain jacket");
      expect(result.notes).toContain(
        "Rain jacket added for current precipitation",
      );
    });

    it("does not add rain jacket for precipitation when jacket already in layers (cold band)", () => {
      const result = getLayerRecommendation(
        makeWeather({ temp: 40, conditionId: 500 }),
        "running",
      );
      expect(result.layers).not.toContain("Waterproof/rain jacket");
    });

    it("does not add rain jacket for non-precipitation conditionId (800 = clear)", () => {
      const result = getLayerRecommendation(
        makeWeather({ temp: 60, conditionId: 800 }),
        "running",
      );
      expect(result.layers).not.toContain("Waterproof/rain jacket");
    });

    it("treats conditionId 200 as precipitation (start of range)", () => {
      const result = getLayerRecommendation(
        makeWeather({ temp: 60, conditionId: 200 }),
        "running",
      );
      expect(result.layers).toContain("Waterproof/rain jacket");
    });

    it("treats conditionId 622 as precipitation (end of range)", () => {
      const result = getLayerRecommendation(
        makeWeather({ temp: 60, conditionId: 622 }),
        "running",
      );
      expect(result.layers).toContain("Waterproof/rain jacket");
    });

    it("does not treat conditionId 623 as precipitation", () => {
      const result = getLayerRecommendation(
        makeWeather({ temp: 60, conditionId: 623 }),
        "running",
      );
      expect(result.layers).not.toContain("Waterproof/rain jacket");
    });
  });
});

describe("getWardrobeRecommendation", () => {
  describe("empty wardrobe fallback", () => {
    it("returns isGeneric: true when wardrobe is empty", () => {
      const result = getWardrobeRecommendation(makeConditions(), [], "running");
      expect(result.isGeneric).toBe(true);
    });

    it("returns generic layer names (strings without ClothingItem) when empty", () => {
      const result = getWardrobeRecommendation(
        makeConditions({ worstTemp: 40, worstFeelsLike: 38 }),
        [],
        "running",
      );
      expect(result.layers.every((l) => typeof l.name === "string")).toBe(true);
      expect(result.layers.every((l) => l.item === undefined)).toBe(true);
    });

    it("passes precipitation flag to generic fallback", () => {
      const result = getWardrobeRecommendation(
        makeConditions({
          worstTemp: 60,
          worstFeelsLike: 58,
          hasPrecipitation: true,
        }),
        [],
        "running",
      );
      expect(
        result.layers.some(
          (l) =>
            l.name.toLowerCase().includes("rain") ||
            l.name.toLowerCase().includes("jacket"),
        ),
      ).toBe(true);
    });
  });

  describe("wardrobe item selection", () => {
    it("returns isGeneric: false when wardrobe has items", () => {
      const item = makeItem();
      const result = getWardrobeRecommendation(
        makeConditions({ worstFeelsLike: 55 }),
        [item],
        "running",
      );
      expect(result.isGeneric).toBe(false);
    });

    it("selects item whose temp range covers worstFeelsLike", () => {
      const item = makeItem({ minTemp: 40, maxTemp: 70 });
      const result = getWardrobeRecommendation(
        makeConditions({ worstFeelsLike: 55 }),
        [item],
        "running",
      );
      expect(result.layers.some((l) => l.name === "Base Layer")).toBe(true);
    });

    it("excludes item when worstFeelsLike is below minTemp", () => {
      const item = makeItem({ minTemp: 50, maxTemp: 70 });
      const result = getWardrobeRecommendation(
        makeConditions({ worstFeelsLike: 40 }),
        [item],
        "running",
      );
      expect(result.layers.some((l) => l.name === "Base Layer")).toBe(false);
    });

    it("excludes item when worstFeelsLike is above maxTemp", () => {
      const item = makeItem({ minTemp: 40, maxTemp: 60 });
      const result = getWardrobeRecommendation(
        makeConditions({ worstFeelsLike: 75 }),
        [item],
        "running",
      );
      expect(result.layers.some((l) => l.name === "Base Layer")).toBe(false);
    });

    it("filters by activity", () => {
      const runItem = makeItem({ name: "Run Base", activities: ["running"] });
      const cycleItem = makeItem({
        id: "2",
        name: "Cycle Base",
        activities: ["cycling"],
      });
      const result = getWardrobeRecommendation(
        makeConditions({ worstFeelsLike: 55 }),
        [runItem, cycleItem],
        "running",
      );
      expect(result.layers.some((l) => l.name === "Run Base")).toBe(true);
      expect(result.layers.some((l) => l.name === "Cycle Base")).toBe(false);
    });

    it("selects item with midpoint closest to worstFeelsLike", () => {
      const farItem = makeItem({
        id: "1",
        name: "Far",
        minTemp: 20,
        maxTemp: 40,
      });
      const closeItem = makeItem({
        id: "2",
        name: "Close",
        minTemp: 45,
        maxTemp: 65,
      });
      const result = getWardrobeRecommendation(
        makeConditions({ worstFeelsLike: 55 }),
        [farItem, closeItem],
        "running",
      );
      expect(result.layers.some((l) => l.name === "Close")).toBe(true);
      expect(result.layers.some((l) => l.name === "Far")).toBe(false);
    });

    it("selects one item per type", () => {
      const item1 = makeItem({ id: "1", name: "Base A", type: "BASE_LAYER" });
      const item2 = makeItem({ id: "2", name: "Base B", type: "BASE_LAYER" });
      const result = getWardrobeRecommendation(
        makeConditions({ worstFeelsLike: 55 }),
        [item1, item2],
        "running",
      );
      const baseLayers = result.layers.filter(
        (l) => l.item?.type === "BASE_LAYER",
      );
      expect(baseLayers.length).toBe(1);
    });
  });

  describe("wind warning", () => {
    it("adds note when wind > 15mph and no windproof item selected", () => {
      const item = makeItem({ isWindproof: false });
      const result = getWardrobeRecommendation(
        makeConditions({ maxWindSpeed: 20, worstFeelsLike: 55 }),
        [item],
        "running",
      );
      expect(
        result.notes.some((n) => n.includes("Wind protection needed")),
      ).toBe(true);
    });

    it("does not add wind note when windproof item is selected", () => {
      const item = makeItem({ isWindproof: true });
      const result = getWardrobeRecommendation(
        makeConditions({ maxWindSpeed: 20, worstFeelsLike: 55 }),
        [item],
        "running",
      );
      expect(
        result.notes.some((n) => n.includes("Wind protection needed")),
      ).toBe(false);
    });

    it("does not add wind note when wind <= 15mph", () => {
      const item = makeItem({ isWindproof: false });
      const result = getWardrobeRecommendation(
        makeConditions({ maxWindSpeed: 10, worstFeelsLike: 55 }),
        [item],
        "running",
      );
      expect(
        result.notes.some((n) => n.includes("Wind protection needed")),
      ).toBe(false);
    });
  });

  describe("rain warning", () => {
    it("adds note when precipitation and no waterproof item selected", () => {
      const item = makeItem({ isWaterproof: false });
      const result = getWardrobeRecommendation(
        makeConditions({ hasPrecipitation: true, worstFeelsLike: 55 }),
        [item],
        "running",
      );
      expect(result.notes.some((n) => n.includes("Rain expected"))).toBe(true);
    });

    it("does not add rain note when waterproof item is selected", () => {
      const item = makeItem({ isWaterproof: true });
      const result = getWardrobeRecommendation(
        makeConditions({ hasPrecipitation: true, worstFeelsLike: 55 }),
        [item],
        "running",
      );
      expect(result.notes.some((n) => n.includes("Rain expected"))).toBe(false);
    });

    it("does not add rain note when no precipitation", () => {
      const item = makeItem({ isWaterproof: false });
      const result = getWardrobeRecommendation(
        makeConditions({ hasPrecipitation: false, worstFeelsLike: 55 }),
        [item],
        "running",
      );
      expect(result.notes.some((n) => n.includes("Rain expected"))).toBe(false);
    });
  });
});
