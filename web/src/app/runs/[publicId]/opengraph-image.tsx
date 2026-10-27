import { COLORS, EMBED_SIZE, EMBED_TYPE, Pixel, RESULT_COLOR, Stat, embedImage, inlineImage } from "@/lib/embed";
import { getRun } from "@/lib/data";
import { challengeName, characterName, characterWiki, difficultyName, formatFrames, itemWiki } from "@/lib/game";

export const alt = "Binding of Isaac run summary";
export const size = EMBED_SIZE;
export const contentType = EMBED_TYPE;

const VERB = { won: "won", died: "died", abandoned: "abandoned" } as const;
const MAX_ITEMS = 10;

export default async function Image({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const row = /^[\w-]{10}$/.test(publicId) ? await getRun(publicId) : null;
  if (!row) return embedImage(<div style={{ display: "flex", fontSize: 72 }}>Run not found</div>);

  const { run: meta, owner } = row;
  const data = meta.data;
  const who = characterName(meta.character, meta.characterName);
  const status = meta.status as keyof typeof VERB;
  const character = characterWiki(meta.character);
  const badge = challengeName(meta.challenge) ?? difficultyName(meta.difficulty);

  const items = [...data.startingItems, ...data.floors.flatMap((f) => f.rooms.flatMap((r) => r.items))]
    .filter((i) => i.kind !== "trinket")
    .map((i) => itemWiki(i)?.image)
    .filter((u): u is string => !!u);
  const shown = [...new Set(items)].slice(-MAX_ITEMS);
  const [portrait, avatar, ...icons] = await Promise.all([
    inlineImage(character?.image.url),
    inlineImage(owner.avatarUrl),
    ...shown.map(inlineImage),
  ]);

  return embedImage(
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 28, paddingLeft: 24 }}>
        <Pixel src={portrait} width={character?.image.width ?? 0} height={character?.image.height ?? 0} scale={2} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 72, lineHeight: 1.1 }}>{`${who} ${VERB[status] ?? "run"}`}</div>
          <div style={{ fontSize: 36, color: COLORS.inkSoft }}>
            {`on ${meta.finalFloorName ?? "the first floor"} · ${badge}`}
          </div>
          {meta.killedBy && <div style={{ fontSize: 32, color: COLORS.blood }}>{`killed by ${meta.killedBy}`}</div>}
        </div>
      </div>
      <div style={{ display: "flex", marginTop: 32, paddingLeft: 24 }}>
        <Stat label="time" value={formatFrames(meta.totalFrames)} />
        <Stat label="floors" value={String(meta.floorsReached)} />
        <Stat label="items" value={String(meta.itemCount)} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 28, paddingLeft: 24 }}>
        {icons.map((src, i) => (
          <Pixel key={i} src={src} width={32} height={32} scale={2} />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 30, paddingLeft: 24, position: "absolute", bottom: 40, left: 40 }}>
        {avatar && <Pixel src={avatar} width={40} height={40} scale={1} />}
        {owner.personaName}
      </div>
    </>,
    RESULT_COLOR[status] ?? COLORS.blood,
  );
}
