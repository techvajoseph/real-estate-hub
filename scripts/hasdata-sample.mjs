// Fetches one page from a HasData listing API and saves the raw JSON, so the
// field mappings in src/lib/hasdata/normalize.ts can be checked against reality.
//
//   npm run hasdata:sample -- zillow "Austin, TX" forSale
//   npm run hasdata:sample -- redfin 78701 forRent

import { mkdir, writeFile } from "node:fs/promises";

const [provider = "zillow", keyword = "Austin, TX", type = "forSale"] = process.argv.slice(2);
const apiKey = process.env.HASDATA_API_KEY;
if (!apiKey) {
  console.error("HASDATA_API_KEY is not set (expected in .env.local)");
  process.exit(1);
}

const url = new URL(`https://api.hasdata.com/scrape/${provider}/listing`);
url.searchParams.set("keyword", keyword);
url.searchParams.set("type", type);

console.log(`GET ${url}`);
const res = await fetch(url, { headers: { "x-api-key": apiKey } });
const body = await res.text();
if (!res.ok) {
  console.error(`HasData returned ${res.status}:\n${body.slice(0, 2000)}`);
  process.exit(1);
}

const json = JSON.parse(body);
await mkdir("samples", { recursive: true });
const file = `samples/${provider}-${type}-${Date.now()}.json`;
await writeFile(file, JSON.stringify(json, null, 2));

const list = ["properties", "listings", "results", "homes", "data"]
  .map((k) => json[k])
  .find(Array.isArray);
console.log(`Saved ${file}`);
console.log(`Top-level keys: ${Object.keys(json).join(", ")}`);
if (list?.length) {
  console.log(`${list.length} listings. First listing keys:\n  ${Object.keys(list[0]).join(", ")}`);
}
