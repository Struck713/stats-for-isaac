// Generates src/lib/game/wiki.json (wiki page and icon for each collectible and trinket id) from the
// Cargo tables on the official Binding of Isaac: Rebirth wiki. The output is committed, so this only
// needs re-running when the wiki adds items.
//   npm run gen:wiki
import { writeFileSync } from "node:fs";
import path from "node:path";

const api = "https://bindingofisaacrebirth.wiki.gg/api.php";
const out = path.resolve(__dirname, "../src/lib/game/wiki.json");

type Row = Record<string, string>;
type CargoResponse = { cargoquery: { title: Row }[] };
type ImageInfoResponse = {
  query: {
    normalized?: { from: string; to: string }[];
    pages: Record<string, { title: string; imageinfo?: { url: string }[] }>;
  };
};

async function get<T>(params: Record<string, string>): Promise<T> {
  const url = `${api}?${new URLSearchParams({ ...params, format: "json" })}`;
  const res = await fetch(url, { headers: { "User-Agent": "stats-for-isaac (gen-wiki script)" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function cargo(table: string, fields: string): Promise<Row[]> {
  const rows: Row[] = [];
  for (let offset = 0; ; offset += 500) {
    const data = await get<CargoResponse>({ action: "cargoquery", tables: table, fields, limit: "500", offset: String(offset) });
    const page = data.cargoquery.map((r) => r.title);
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}

// "File:Foo icon.png" -> its current URL on the wiki's image server.
async function fileUrls(files: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  for (let i = 0; i < files.length; i += 50) {
    const batch = files.slice(i, i + 50);
    const data = await get<ImageInfoResponse>({ action: "query", prop: "imageinfo", iiprop: "url", titles: batch.map((f) => `File:${f}`).join("|") });
    // Titles come back normalized ("foo_bar.png" -> "Foo bar.png"), so map them back to what we asked for.
    const original = new Map<string, string>(batch.map((f) => [`File:${f}`, f]));
    for (const n of data.query.normalized ?? []) original.set(n.to, original.get(n.from)!);
    for (const p of Object.values(data.query.pages)) {
      const url = p.imageinfo?.[0]?.url;
      if (url) urls.set(original.get(p.title) ?? p.title.replace(/^File:/, ""), url);
    }
  }
  return urls;
}

type Entry = { page: string; image?: string };

// Items are joined to their icons by alias. An item can have one icon per DLC; `dlc` is a bitmask
// of the versions the icon applies to, so the highest value is the newest art.
async function table(kind: "collectible" | "trinket"): Promise<Record<number, Entry>> {
  const items = await cargo(kind, "_pageName=page,alias,id");
  const images = await cargo(`${kind}_image`, `${kind}=alias,file,dlc`);
  const best = new Map<string, Row>();
  for (const img of images) {
    const cur = best.get(img.alias);
    if (!cur || Number(img.dlc) > Number(cur.dlc)) best.set(img.alias, img);
  }
  const urls = await fileUrls([...new Set([...best.values()].map((r) => r.file))]);
  const result: Record<number, Entry> = {};
  for (const item of items) {
    const id = Number(item.id);
    if (!Number.isInteger(id) || id <= 0 || id in result) continue;
    const file = best.get(item.alias)?.file;
    result[id] = { page: item.page, image: file ? urls.get(file) : undefined };
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => Number(a) - Number(b)));
}

async function main() {
  const wiki = { collectibles: await table("collectible"), trinkets: await table("trinket") };
  writeFileSync(out, JSON.stringify(wiki, null, 1) + "\n");
  for (const [k, v] of Object.entries(wiki)) {
    const entries = Object.values(v);
    console.log(`${k}: ${entries.length} (${entries.filter((e) => !e.image).length} without an icon)`);
  }
  console.log(`Wrote ${out}`);
}

main();
