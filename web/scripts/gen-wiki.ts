// Generates src/lib/game/wiki.json (wiki page and icon for each collectible and trinket id, wiki page
// and sprite for each character, plus the HUD and minimap sprites in SPRITES) from the official Binding of Isaac: Rebirth wiki. The output is committed, so this only
// needs re-running when the wiki adds items.
//   npm run gen:wiki
import { writeFileSync } from "node:fs";
import path from "node:path";
import names from "../src/lib/game/names.json";

const api = "https://bindingofisaacrebirth.wiki.gg/api.php";
const out = path.resolve(__dirname, "../src/lib/game/wiki.json");

type Row = Record<string, string>;
type CargoResponse = { cargoquery: { title: Row }[] };
type ImageInfoResponse = {
  query: {
    normalized?: { from: string; to: string }[];
    pages: Record<string, { title: string; imageinfo?: { url: string; width: number; height: number }[] }>;
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

type FileInfo = { url: string; width: number; height: number };

// "File:Foo icon.png" -> its current URL on the wiki's image server and its size.
async function fileInfo(files: string[]): Promise<Map<string, FileInfo>> {
  const urls = new Map<string, FileInfo>();
  for (let i = 0; i < files.length; i += 50) {
    const batch = files.slice(i, i + 50);
    const data = await get<ImageInfoResponse>({ action: "query", prop: "imageinfo", iiprop: "url|size", titles: batch.map((f) => `File:${f}`).join("|") });
    // Titles come back normalized ("foo_bar.png" -> "Foo bar.png"), so map them back to what we asked for.
    const original = new Map<string, string>(batch.map((f) => [`File:${f}`, f]));
    for (const n of data.query.normalized ?? []) original.set(n.to, original.get(n.from)!);
    for (const p of Object.values(data.query.pages)) {
      const info = p.imageinfo?.[0];
      if (info) urls.set(original.get(p.title) ?? p.title.replace(/^File:/, ""), { url: info.url, width: info.width, height: info.height });
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
  const urls = await fileInfo([...new Set([...best.values()].map((r) => r.file))]);
  const result: Record<number, Entry> = {};
  for (const item of items) {
    const id = Number(item.id);
    if (!Number.isInteger(id) || id <= 0 || id in result) continue;
    const file = best.get(item.alias)?.file;
    result[id] = { page: item.page, image: file ? urls.get(file)?.url : undefined };
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => Number(a) - Number(b)));
}

// Our character names (from PlayerType) that the wiki's player table spells differently.
const CHARACTER_ALIASES: Record<string, string> = { "Dark Judas": "Black Judas" };

// The wiki's player ids are unreliable, so characters are matched to it by name instead.
async function characters(): Promise<Record<number, { page: string; image: FileInfo }>> {
  const pages = new Map((await cargo("player", "_pageName=page,alias")).map((r) => [r.alias, r.page]));
  const best = new Map<string, Row>();
  for (const img of await cargo("player_image", "player=alias,file,dlc")) {
    const cur = best.get(img.alias);
    if (!cur || Number(img.dlc) > Number(cur.dlc)) best.set(img.alias, img);
  }
  const info = await fileInfo([...new Set([...best.values()].map((r) => r.file))]);
  const result: Record<number, { page: string; image: FileInfo }> = {};
  for (const [id, name] of Object.entries(names.characters)) {
    if (Number(id) < 0) continue;
    const alias = CHARACTER_ALIASES[name] ?? name;
    const page = pages.get(alias);
    const image = info.get(best.get(alias)?.file ?? "");
    if (!page || !image) throw new Error(`Character ${id} (${name}): no wiki page or sprite for "${alias}"`);
    result[Number(id)] = { page, image };
  }
  return result;
}

// HUD and minimap art used around the site. Minimap icons are keyed by RoomType.
const SPRITES: Record<string, string> = {
  heartRedFull: "HUD heart red full.png",
  heartRedHalf: "HUD heart red half.png",
  heartRedEmpty: "HUD heart red empty.png",
  heartSoulFull: "HUD heart soul full.png",
  heartSoulHalf: "HUD heart soul half.png",
  coin: "HUD penny.png",
  bomb: "Bomb.png",
  key: "Key.png",
  speed: "Attribute speed icon.png",
  tears: "Attribute tears icon.png",
  damage: "Attribute damage icon.png",
  range: "Attribute range icon.png",
  shotSpeed: "Attribute shot speed icon.png",
  luck: "Attribute luck icon.png",
  room2: "Shop Icon.png",
  room4: "Treasure Room Icon.png",
  room5: "Boss Room Icon.png",
  room6: "Mini-Boss Room Icon.png",
  room7: "Secret Room Icon.png",
  room8: "Super Secret Room Icon.png",
  room9: "Arcade Icon.png",
  room10: "Curse Room Icon.png",
  room11: "Challenge Room Icon.png",
  room12: "Library Icon.png",
  room13: "Sacrifice Room Icon.png",
  room14: "Devil Room Icon.png",
  room15: "Angel Room Icon.png",
  room18: "Bedroom Icon.png",
  room19: "Dirty Bedroom Icon.png",
  room20: "Vault Icon.png",
  room21: "Dice Room Icon.png",
  room24: "Planetarium Icon.png",
  room29: "Ultra Secret Room Icon.png",
};

async function sprites(): Promise<Record<string, FileInfo>> {
  const info = await fileInfo(Object.values(SPRITES));
  return Object.fromEntries(
    Object.entries(SPRITES).map(([key, file]) => {
      const f = info.get(file);
      if (!f) throw new Error(`Sprite ${key}: no file "${file}" on the wiki`);
      return [key, f];
    }),
  );
}

async function main() {
  const wiki = { collectibles: await table("collectible"), trinkets: await table("trinket"), characters: await characters(), sprites: await sprites() };
  writeFileSync(out, JSON.stringify(wiki, null, 1) + "\n");
  for (const [k, v] of Object.entries({ collectibles: wiki.collectibles, trinkets: wiki.trinkets })) {
    const entries = Object.values(v);
    console.log(`${k}: ${entries.length} (${entries.filter((e) => !e.image).length} without an icon)`);
  }
  console.log(`characters: ${Object.keys(wiki.characters).length}`);
  console.log(`Wrote ${out}`);
}

main();
