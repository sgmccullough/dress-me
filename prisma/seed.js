const Database = require("better-sqlite3");
const path = require("path");
const { randomUUID } = require("crypto");

const db = new Database(path.join(__dirname, "dev.db"));

const user = db.prepare("SELECT id FROM User LIMIT 1").get();
if (!user) {
  console.error("No user found — sign in first, then run the seed.");
  process.exit(1);
}

const items = [
  {
    name: "Winter Jacket",
    type: "OUTER_LAYER",
    minTemp: 15,
    maxTemp: 42,
    isWindproof: true,
    isWaterproof: true,
  },
  {
    name: "Gilet",
    type: "OUTER_LAYER",
    minTemp: 40,
    maxTemp: 62,
    isWindproof: true,
    isWaterproof: false,
  },
  {
    name: "Short Sleeve Jersey",
    type: "MID_LAYER",
    minTemp: 62,
    maxTemp: 85,
    isWindproof: false,
    isWaterproof: false,
  },
  {
    name: "Long Sleeve Jersey",
    type: "MID_LAYER",
    minTemp: 45,
    maxTemp: 65,
    isWindproof: false,
    isWaterproof: false,
  },
  {
    name: "Brevet Jersey",
    type: "MID_LAYER",
    minTemp: 38,
    maxTemp: 65,
    isWindproof: false,
    isWaterproof: false,
  },
  {
    name: "Lightweight Base Layer",
    type: "BASE_LAYER",
    minTemp: 52,
    maxTemp: 75,
    isWindproof: false,
    isWaterproof: false,
  },
  {
    name: "Merino Base Layer",
    type: "BASE_LAYER",
    minTemp: 35,
    maxTemp: 58,
    isWindproof: false,
    isWaterproof: false,
  },
  {
    name: "Thermal Base Layer",
    type: "BASE_LAYER",
    minTemp: 15,
    maxTemp: 42,
    isWindproof: false,
    isWaterproof: false,
  },
  {
    name: "Leg Warmers",
    type: "BOTTOMS",
    minTemp: 35,
    maxTemp: 58,
    isWindproof: false,
    isWaterproof: false,
  },
  {
    name: "Socks",
    type: "ACCESSORIES",
    minTemp: 48,
    maxTemp: 85,
    isWindproof: false,
    isWaterproof: false,
  },
  {
    name: "Winter Socks",
    type: "ACCESSORIES",
    minTemp: 15,
    maxTemp: 52,
    isWindproof: false,
    isWaterproof: false,
  },
  {
    name: "Shoes",
    type: "ACCESSORIES",
    minTemp: 48,
    maxTemp: 85,
    isWindproof: false,
    isWaterproof: false,
  },
  {
    name: "Winter Boots",
    type: "ACCESSORIES",
    minTemp: 15,
    maxTemp: 45,
    isWindproof: false,
    isWaterproof: false,
  },
  {
    name: "Arm Warmers",
    type: "ACCESSORIES",
    minTemp: 42,
    maxTemp: 62,
    isWindproof: false,
    isWaterproof: false,
  },
  {
    name: "Overshoes",
    type: "ACCESSORIES",
    minTemp: 15,
    maxTemp: 52,
    isWindproof: true,
    isWaterproof: true,
  },
  {
    name: "Fingerless Gloves",
    type: "ACCESSORIES",
    minTemp: 52,
    maxTemp: 70,
    isWindproof: false,
    isWaterproof: false,
  },
  {
    name: "Full Gloves",
    type: "ACCESSORIES",
    minTemp: 35,
    maxTemp: 54,
    isWindproof: false,
    isWaterproof: false,
  },
  {
    name: "Winter Gloves",
    type: "ACCESSORIES",
    minTemp: 15,
    maxTemp: 38,
    isWindproof: true,
    isWaterproof: false,
  },
];

const now = new Date().toISOString();
const stmt = db.prepare(`
  INSERT OR IGNORE INTO ClothingItem
    (id, userId, name, type, activities, minTemp, maxTemp, isWindproof, isWaterproof, notes, createdAt, updatedAt)
  VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
`);

let inserted = 0;
for (const item of items) {
  const result = stmt.run(
    randomUUID(),
    user.id,
    item.name,
    item.type,
    JSON.stringify(["cycling"]),
    item.minTemp,
    item.maxTemp,
    item.isWindproof ? 1 : 0,
    item.isWaterproof ? 1 : 0,
    now,
    now,
  );
  if (result.changes > 0) inserted++;
}

console.log(`Seeded ${inserted} of ${items.length} items for user ${user.id}`);
db.close();
