import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

function fail(message) {
  throw new Error(`Objektív24 public build validation failed: ${message}`);
}

async function readNonEmpty(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  let content;
  try {
    content = await fs.readFile(fullPath, "utf8");
  } catch {
    fail(`missing file ${relativePath}`);
  }
  if (!content.trim()) fail(`empty file ${relativePath}`);
  return content;
}

const app = await readNonEmpty("app.js");
const base = app.match(/const SUPABASE_PUBLIC_URL="([^"]+)"/)?.[1];
const key = app.match(/const SUPABASE_PUBLIC_KEY="([^"]+)"/)?.[1];

if (!base || !key) fail("missing public Supabase configuration in app.js");

const apiUrl =
  `${base}/rest/v1/drafts?state=eq.published&select=slug&order=published_at.desc.nullslast,updated_at.desc`;

const response = await fetch(apiUrl, {
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`
  }
});

if (!response.ok) {
  fail(`Supabase published-article check returned HTTP ${response.status}`);
}

const rows = await response.json();
if (!Array.isArray(rows) || rows.length === 0) {
  fail("Supabase public API returned zero published articles");
}

for (const row of rows) {
  const slug = String(row?.slug || "").trim();
  if (!slug) fail("a published Supabase article has no slug");
  await readNonEmpty(path.join("clanky", slug, "index.html"));
}

const homepage = await readNonEmpty("index.html");
if (!homepage.includes("Objektív24") && !homepage.includes("OBJEKTÍV")) {
  fail("homepage does not contain Objektív24 branding");
}

const sitemap = await readNonEmpty("sitemap.xml");
if (!sitemap.includes("https://objektiv24.sk/sitemap-pages.xml")) {
  fail("sitemap index does not reference sitemap-pages.xml");
}

const pagesSitemap = await readNonEmpty("sitemap-pages.xml");
if (!pagesSitemap.includes("https://objektiv24.sk/clanky/")) {
  fail("page sitemap does not contain the article archive");
}

const health = JSON.parse(await readNonEmpty("deploy-health.json"));
if (health.status !== "ok" || !health.commit) {
  fail("deployment marker is invalid");
}

console.log(
  `Objektív24 smoke test OK: ${rows.length} published Supabase articles, generated pages, sitemap and deployment marker verified.`
);
