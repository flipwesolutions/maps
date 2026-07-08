/**
 * Downloads open city datasets and writes bundled JSON for offline search.
 * Usage: npm run fetch-places
 *
 * Offline data = cities & towns. Villages, roads, shops → live OSM search in app.
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  createWriteStream,
  rmSync,
} from "fs";
import { execSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LIB_DIR = join(__dirname, "..", "lib");
const PLACES_DIR = join(LIB_DIR, "places");
const TMP_DIR = join(__dirname, ".tmp-places");

const URLS = {
  vynexIndia:
    "https://raw.githubusercontent.com/Vynex/indian-cities-geodata/main/src/cities.json",
  lutangarWorld:
    "https://raw.githubusercontent.com/lutangar/cities.json/master/cities.json",
  dr5hnCountries:
    "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/countries.json",
  geonames5000: "https://download.geonames.org/export/dump/cities5000.zip",
};

function slug(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function dedupe(places) {
  const seen = new Set();
  return places.filter((p) => {
    const key = `${p.name.toLowerCase()}|${p.coordinates[0].toFixed(4)},${p.coordinates[1].toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function downloadJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "FlipwiMaps-POC/1.0 (place-data-fetch)" },
  });
  if (!response.ok) throw new Error(`Download failed ${response.status}: ${url}`);
  return response.json();
}

async function downloadFile(url, dest) {
  const response = await fetch(url, {
    headers: { "User-Agent": "FlipwiMaps-POC/1.0 (place-data-fetch)" },
  });
  if (!response.ok) throw new Error(`Download failed ${response.status}: ${url}`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(dest));
}

function loadCuratedSeed() {
  const path = join(LIB_DIR, "india-places-data.ts");
  const src = readFileSync(path, "utf8");
  const places = [];
  const re =
    /p\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*([\d.]+),\s*([\d.]+)(?:,\s*"([^"]+)")?\)/g;
  let m;
  while ((m = re.exec(src))) {
    places.push({
      id: `seed-${m[1]}`,
      name: m[2],
      subtitle: m[3],
      coordinates: [parseFloat(m[4]), parseFloat(m[5])],
      type: m[6] ?? "city",
    });
  }
  return places;
}

function mapVynex(rows) {
  return rows
    .filter((r) => r.city && r.latitude != null && r.longitude != null)
    .map((r) => ({
      id: `in-${slug(r.city)}-${slug(r.state)}`,
      name: r.city,
      subtitle: [r.district, r.state].filter(Boolean).join(", ") || r.state,
      coordinates: [parseFloat(r.longitude), parseFloat(r.latitude)],
      type: "city",
    }));
}

function mapGeoNamesIndia(rows, prefix = "gn") {
  return rows
    .filter((r) => r.country === "IN" && r.name && r.lat && r.lng)
    .map((r, i) => ({
      id: `${prefix}-in-${slug(r.name)}-${i}`,
      name: r.name,
      subtitle: r.state ? `${r.state}, India` : "India",
      coordinates: [parseFloat(r.lng), parseFloat(r.lat)],
      type: r.feature === "PPL" ? "village" : "town",
    }));
}

function mapWorld(rows, countryNames) {
  return rows
    .filter((r) => r.name && r.lat && r.lng)
    .map((r, i) => ({
      id: `w-${r.country}-${slug(r.name)}-${i}`,
      name: r.name,
      subtitle: countryNames[r.country] ?? r.country,
      coordinates: [parseFloat(r.lng), parseFloat(r.lat)],
      type: "city",
    }));
}

function parseGeoNamesTsv(text) {
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const c = line.split("\t");
      return {
        name: c[1],
        lat: c[4],
        lng: c[5],
        feature: c[7],
        country: c[8],
        state: c[10],
      };
    });
}

async function downloadGeoNames5000() {
  mkdirSync(TMP_DIR, { recursive: true });
  const zipPath = join(TMP_DIR, "cities5000.zip");
  const txtPath = join(TMP_DIR, "cities5000.txt");

  console.log("Downloading GeoNames cities5000 (towns 5000+ pop)…");
  await downloadFile(URLS.geonames5000, zipPath);

  try {
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${TMP_DIR}' -Force"`,
      { stdio: "inherit" }
    );
  } catch {
    console.warn("  Zip expand failed — skipping cities5000");
    return [];
  }

  const raw = readFileSync(txtPath, "utf8");
  const rows = parseGeoNamesTsv(raw);
  console.log(`  → ${rows.length} global towns (cities5000)`);
  return rows;
}

async function main() {
  mkdirSync(PLACES_DIR, { recursive: true });

  console.log("Loading curated India landmarks…");
  const curated = loadCuratedSeed();
  console.log(`  → ${curated.length} landmarks`);

  console.log("Downloading India census cities (100k+ pop)…");
  const vynex = mapVynex(await downloadJson(URLS.vynexIndia));
  console.log(`  → ${vynex.length} census cities`);

  console.log("Downloading GeoNames world cities…");
  const geoRows = await downloadJson(URLS.lutangarWorld);
  const geoIndia = mapGeoNamesIndia(geoRows);
  console.log(`  → ${geoIndia.length} GeoNames India localities`);

  const geo5000 = await downloadGeoNames5000();
  const geo5000India = mapGeoNamesIndia(
    geo5000.filter((r) => r.country === "IN"),
    "g5"
  );
  console.log(`  → ${geo5000India.length} India towns (GeoNames 5000+)`);

  const indiaPlaces = dedupe([
    ...curated,
    ...vynex,
    ...geoIndia,
    ...geo5000India,
  ]).sort((a, b) => a.name.localeCompare(b.name));

  const indiaPath = join(PLACES_DIR, "india-places.json");
  writeFileSync(indiaPath, JSON.stringify(indiaPlaces));
  console.log(`Wrote ${indiaPath} (${indiaPlaces.length} places)`);

  console.log("Downloading country names…");
  const countries = await downloadJson(URLS.dr5hnCountries);
  const countryNames = Object.fromEntries(
    countries.map((c) => [c.iso2, c.name])
  );

  const geo5000World = geo5000
    .filter((r) => r.name && r.lat && r.lng)
    .map((r, i) => ({
      id: `g5-${r.country}-${slug(r.name)}-${i}`,
      name: r.name,
      subtitle: countryNames[r.country] ?? r.country,
      coordinates: [parseFloat(r.lng), parseFloat(r.lat)],
      type: "town",
    }));

  const worldPlaces = dedupe([
    ...mapWorld(geoRows, countryNames),
    ...geo5000World,
  ]).sort((a, b) => a.name.localeCompare(b.name));

  const worldPath = join(PLACES_DIR, "world-places.json");
  writeFileSync(worldPath, JSON.stringify(worldPlaces));
  console.log(`Wrote ${worldPath} (${worldPlaces.length} places)`);

  try {
    rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {
    /* ignore */
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
