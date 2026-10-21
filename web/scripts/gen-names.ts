// Generates src/lib/game/names.json (readable names for game enums) from the IsaacDocs checkout in
// the repo root. The output is committed, so this only needs re-running when IsaacDocs updates.
//   npm run gen:names
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const docs = path.resolve(__dirname, "../../IsaacDocs");
const out = path.resolve(__dirname, "../src/lib/game/names.json");

const SMALL = new Set(["of", "the", "a", "an", "and", "in", "on", "to", "for", "with", "or"]);

function titleCase(words: string[]): string {
  return words
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i > 0 && SMALL.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

// "COLLECTIBLE_SAD_ONION" with prefix "COLLECTIBLE_" -> "Sad Onion"
function prettyEnum(key: string, prefix: string): string {
  return titleCase(key.replace(prefix, "").split("_").filter(Boolean));
}

// Reads the "|DLC|Value|Enumerator|Comment|" tables in IsaacDocs/docs/enums/*.md.
function readEnum(name: string): Map<number, string> {
  const text = readFileSync(path.join(docs, "docs/enums", `${name}.md`), "utf8");
  const values = new Map<number, string>();
  for (const line of text.split("\n")) {
    const m = line.match(/^\|[^|]*\|\s*(-?\d+)\s*\|\s*([A-Z0-9_]+)\s/);
    if (m && !values.has(Number(m[1]))) values.set(Number(m[1]), m[2]);
  }
  return values;
}

function prettyTable(name: string, prefix: string, skip: string[] = []): Record<number, string> {
  const table: Record<number, string> = {};
  for (const [value, key] of readEnum(name)) {
    if (skip.some((s) => key.endsWith(s))) continue;
    table[value] = prettyEnum(key, prefix);
  }
  return table;
}

// items.xml names are localization keys like "#THE_SAD_ONION_NAME", which read better than the
// enum names ("The Sad Onion" vs "Sad Onion"), but the checked-in file predates Repentance, so
// the enum fills in everything newer.
function itemsXmlNames(tags: string[]): Map<number, string> {
  const xml = readFileSync(path.join(docs, "scripts/data/items.xml"), "utf8");
  const names = new Map<number, string>();
  const re = /<(\w+)\s([^>]*)\/>/g;
  for (const m of xml.matchAll(re)) {
    if (!tags.includes(m[1])) continue;
    const id = m[2].match(/\bid="(\d+)"/)?.[1];
    const name = m[2].match(/\bname="#?([A-Z0-9_]+?)(?:_NAME)?"/)?.[1];
    if (id && name) names.set(Number(id), titleCase(name.split("_")));
  }
  return names;
}

function merge(base: Record<number, string>, overrides: Map<number, string>): Record<number, string> {
  for (const [id, name] of overrides) {
    if (id in base) base[id] = name;
  }
  return base;
}

// Enum keys run words together (ENTITY_LARRYJR), so prefer the boss tables ("|Monstro|20|...")
// and enum comments of the form "19 boss: Larry Jr./Hollow".
function entityNames(): Record<number, string> {
  const result = prettyTable("EntityType", "ENTITY_");
  const enumText = readFileSync(path.join(docs, "docs/enums/EntityType.md"), "utf8");
  for (const m of enumText.matchAll(/^\|[^|]*\|\s*(\d+)\s*\|[^|]*\|\s*\d+\s+boss:\s*([^|/]+?)\s*(?:\/[^|]*)?\|/gm)) {
    result[Number(m[1])] = m[2].replace(/\.$/, "");
  }
  const bossDir = path.join(docs, "docs/entities/bosses");
  const seen = new Set<number>();
  for (const file of readdirSync(bossDir)) {
    const text = readFileSync(path.join(bossDir, file), "utf8");
    for (const m of text.matchAll(/^\|([^|]*[A-Za-z][^|]*)\|(\d+)\|/gm)) {
      const name = m[1].replace(/\s*\(.*\)\s*$/, "").trim();
      const id = Number(m[2]);
      if (name && name !== "Boss" && !seen.has(id)) {
        seen.add(id);
        result[id] = name;
      }
    }
  }
  return result;
}

const characterBase: Record<string, string> = {
  ISAAC: "Isaac",
  MAGDALENE: "Magdalene",
  CAIN: "Cain",
  JUDAS: "Judas",
  BLUEBABY: "???",
  EVE: "Eve",
  SAMSON: "Samson",
  AZAZEL: "Azazel",
  LAZARUS: "Lazarus",
  EDEN: "Eden",
  THELOST: "The Lost",
  LAZARUS2: "Lazarus Risen",
  BLACKJUDAS: "Dark Judas",
  LILITH: "Lilith",
  KEEPER: "Keeper",
  APOLLYON: "Apollyon",
  THEFORGOTTEN: "The Forgotten",
  THESOUL: "The Soul",
  BETHANY: "Bethany",
  JACOB: "Jacob",
  ESAU: "Esau",
  POSSESSOR: "Possessor",
};

const characters: Record<number, string> = {};
for (const [value, key] of readEnum("PlayerType")) {
  const base = key.replace(/^PLAYER_/, "");
  const tainted = base.endsWith("_B");
  const plain = tainted ? base.slice(0, -2) : base;
  if (plain === "NUM_PLAYER_TYPES") continue;
  const name = characterBase[plain] ?? prettyEnum(plain, "");
  characters[value] = tainted ? `Tainted ${name}` : name;
}

const names = {
  collectibles: merge(
    prettyTable("CollectibleType", "COLLECTIBLE_", ["_NULL", "NUM_COLLECTIBLES"]),
    itemsXmlNames(["passive", "active", "familiar"]),
  ),
  trinkets: merge(prettyTable("TrinketType", "TRINKET_", ["_NULL", "NUM_TRINKETS"]), itemsXmlNames(["trinket"])),
  cards: prettyTable("Card", "CARD_", ["_NULL", "_RANDOM", "NUM_CARDS"]),
  pills: prettyTable("PillEffect", "PILLEFFECT_", ["_NULL", "NUM_PILL_EFFECTS"]),
  entities: entityNames(),
  challenges: prettyTable("Challenge", "CHALLENGE_", ["_NULL", "NUM_CHALLENGES"]),
  characters,
};

writeFileSync(out, JSON.stringify(names, null, 1) + "\n");
console.log(
  `Wrote ${out}: ` +
    Object.entries(names)
      .map(([k, v]) => `${Object.keys(v).length} ${k}`)
      .join(", "),
);
