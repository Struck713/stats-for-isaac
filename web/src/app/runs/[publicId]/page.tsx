import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { CopyLinkButton } from "@/components/isaac/CopyLinkButton";
import { DeathNote } from "@/components/isaac/DeathNote";
import { FloorCard } from "@/components/isaac/FloorCard";
import { Paper, SectionTitle } from "@/components/isaac/Paper";
import { ResultBadge } from "@/components/isaac/ResultBadge";
import { HeartAmount } from "@/components/isaac/Sprite";
import { ItemChip } from "@/components/isaac/Stats";
import { ClockIcon } from "@/components/isaac/icons";
import { getRun } from "@/lib/data";
import { challengeName, characterName, characterWiki, difficultyName, formatFrames } from "@/lib/game";
import type { Item, Run } from "@/lib/runSchema";

const RESULT_TEXT = { won: "won", died: "died", abandoned: "abandoned" } as const;

async function load(params: PageProps<"/runs/[publicId]">["params"]) {
  const { publicId } = await params;
  return /^[\w-]{10}$/.test(publicId) ? getRun(publicId) : null;
}

export async function generateMetadata({ params }: PageProps<"/runs/[publicId]">): Promise<Metadata> {
  const row = await load(params);
  if (!row) return { title: "Run not found" };
  const { run, owner } = row;
  const who = characterName(run.character, run.characterName);
  const title = `${who} ${RESULT_TEXT[run.status as keyof typeof RESULT_TEXT] ?? "run"} on ${run.finalFloorName ?? "the first floor"}`;
  const description = `${owner.personaName}'s run · ${formatFrames(run.totalFrames)} · ${run.floorsReached} floors · ${run.itemCount} items${run.killedBy ? ` · killed by ${run.killedBy}` : ""}`;
  return { title, description, openGraph: { title, description, type: "article" } };
}

export default function RunPage(props: PageProps<"/runs/[publicId]">) {
  return (
    <Suspense fallback={<Paper>Loading run…</Paper>}>
      <RunDetails {...props} />
    </Suspense>
  );
}

function totals(run: Run) {
  const t = { explored: 0, rooms: 0, kills: 0, bossKills: 0, hits: 0, damage: 0, coinsGained: 0, coinsSpent: 0 };
  for (const f of run.floors) {
    const s = f.summary;
    if (!s) continue;
    t.explored += s.roomsExplored;
    t.rooms += s.roomsInLayout;
    t.kills += s.kills;
    t.bossKills += s.bossKills;
    t.hits += s.hits;
    t.damage += s.damageTaken;
    t.coinsGained += s.resources.coins?.gained ?? 0;
    t.coinsSpent += s.resources.coins?.spent ?? 0;
  }
  return t;
}

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "long" });

async function RunDetails({ params }: PageProps<"/runs/[publicId]">) {
  const row = await load(params);
  if (!row) notFound();
  const { run: meta, owner } = row;
  const run = meta.data;
  const challenge = challengeName(run.challenge);
  const character = characterWiki(run.character);
  const collected: Item[] = [...run.startingItems, ...run.floors.flatMap((f) => f.rooms.flatMap((r) => r.items))];
  const t = totals(run);

  return (
    <>
      <Paper tilt={-0.4}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-end gap-3 text-5xl">
              {character && (
                // Wiki sprites are tiny pixel art; next/image would only re-encode them.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={character.image.url}
                  alt=""
                  width={character.image.width * 2}
                  height={character.image.height * 2}
                  className="[image-rendering:pixelated]"
                />
              )}
              {character ? (
                <a href={character.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {characterName(run.character, run.characterName)}
                </a>
              ) : (
                characterName(run.character, run.characterName)
              )}
            </h1>
            <p className="mt-1 text-lg">
              <Link href={`/u/${owner.steamId}`} className="underline">
                {owner.personaName}
              </Link>
              {" · "}
              {dateFormat.format(meta.endedAt ?? meta.uploadedAt)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <ResultBadge status={run.status} size="lg" />
            <CopyLinkButton />
          </div>
        </div>
        <hr className="ink-rule my-4" />
        <dl className="grid grid-cols-2 gap-3 font-isaac text-lg sm:grid-cols-5">
          <div>
            <dt className="text-sm text-ink-soft">Time</dt>
            <dd className="flex items-center gap-1">
              <ClockIcon size={18} /> {formatFrames(run.totalFrames)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">Difficulty</dt>
            <dd>{difficultyName(run.difficulty)}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">Seed</dt>
            <dd className="font-mono">{run.seed}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">Floors</dt>
            <dd>{run.floors.length}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">Items</dt>
            <dd>{meta.itemCount}</dd>
          </div>
        </dl>
        {challenge && <p className="mt-3 font-isaac text-lg">Challenge: {challenge}</p>}
        {run.partial && (
          <p className="mt-3 text-sm italic text-ink-soft">
            The mod only started recording partway through this run, so the start is missing.
          </p>
        )}
      </Paper>

      {run.status === "died" && <DeathNote run={run} items={collected} />}

      {run.status !== "died" && collected.length > 0 && (
        <Paper tilt={0.5}>
          <SectionTitle>Items</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {collected.map((item, i) => (
              <ItemChip key={i} item={item} />
            ))}
          </div>
        </Paper>
      )}

      <Paper tilt={-0.3}>
        <SectionTitle>Whole run</SectionTitle>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {([
            ["Rooms explored", `${t.explored}/${t.rooms}`],
            ["Kills", t.kills],
            ["Bosses beaten", t.bossKills],
            ["Hits taken", <>{t.hits} (<HeartAmount halves={t.damage} scale={2} />)</>],
            ["Coins found", t.coinsGained],
            ["Coins spent", t.coinsSpent],
          ] as [string, ReactNode][]).map(([label, value]) => (
            <div key={label}>
              <dt className="font-isaac text-sm text-ink-soft">{label}</dt>
              <dd className="text-2xl tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </Paper>

      {run.floors.map((floor, i) => (
        <FloorCard
          key={floor.index}
          floor={floor}
          endedHere={run.status !== "won" && floor.index === run.endedOnFloor}
          tilt={i % 2 === 0 ? 0.25 : -0.25}
        />
      ))}
    </>
  );
}
