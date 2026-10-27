import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Paper, SectionTitle } from "@/components/isaac/Paper";
import { RunList } from "@/components/isaac/RunList";
import { getUserBySteamId, getUserTotals, listUserRuns } from "@/lib/data";
import { characterName, formatFrames } from "@/lib/game";

const PAGE_SIZE = 25;

export async function generateMetadata({ params }: PageProps<"/u/[steamId]">): Promise<Metadata> {
  const { steamId } = await params;
  const user = /^\d{17}$/.test(steamId) ? await getUserBySteamId(steamId) : null;
  if (!user) return { title: "Player not found" };
  const totals = await getUserTotals(user.id);
  const winRate = totals.runs > 0 ? Math.round((totals.wins / totals.runs) * 100) : 0;
  const title = `${user.personaName}'s runs`;
  const description =
    `${totals.runs} runs · ${totals.wins} wins (${winRate}%) · ${totals.deaths} deaths` +
    (totals.favorite ? ` · favorite: ${characterName(totals.favorite.character, totals.favorite.characterName)}` : "");
  const url = `/u/${steamId}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, type: "profile", url, siteName: "Stats for Isaac" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function ProfilePage(props: PageProps<"/u/[steamId]">) {
  return (
    <Suspense fallback={<Paper>Loading…</Paper>}>
      <Profile {...props} />
    </Suspense>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="font-isaac text-3xl">{value}</div>
      <div className="text-sm text-ink-soft">{label}</div>
    </div>
  );
}

async function Profile({ params, searchParams }: PageProps<"/u/[steamId]">) {
  const { steamId } = await params;
  const { page: pageParam } = await searchParams;
  const user = /^\d{17}$/.test(steamId) ? await getUserBySteamId(steamId) : null;
  if (!user) notFound();

  const page = Math.max(0, Number(pageParam ?? 1) - 1) || 0;
  const [totals, runs] = await Promise.all([getUserTotals(user.id), listUserRuns(user.id, page, PAGE_SIZE)]);
  const winRate = totals.runs > 0 ? Math.round((totals.wins / totals.runs) * 100) : 0;
  const pages = Math.max(1, Math.ceil(totals.runs / PAGE_SIZE));

  return (
    <>
      <Paper tilt={-0.5}>
        <div className="flex flex-wrap items-center gap-4">
          {user.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" width={72} height={72} className="rounded-md border-3 border-ink" />
          )}
          <div>
            <h1 className="text-4xl">{user.personaName}</h1>
            {user.profileUrl && (
              <a href={user.profileUrl} className="text-sm underline" rel="noreferrer">
                Steam profile
              </a>
            )}
          </div>
        </div>
        <hr className="ink-rule my-5" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Stat label="Runs" value={totals.runs} />
          <Stat label="Wins" value={totals.wins} />
          <Stat label="Deaths" value={totals.deaths} />
          <Stat label="Win rate" value={`${winRate}%`} />
          <Stat label="Time played" value={formatFrames(totals.frames)} />
        </div>
        {totals.favorite && (
          <p className="mt-4 text-center">
            Most played: <span className="font-isaac text-xl">{characterName(totals.favorite.character, totals.favorite.characterName)}</span>{" "}
            ({totals.favorite.n} runs)
          </p>
        )}
      </Paper>

      <Paper tilt={0.3}>
        <SectionTitle>Runs</SectionTitle>
        <RunList runs={runs} />
        {pages > 1 && (
          <nav className="mt-4 flex items-center justify-center gap-4 font-isaac text-lg">
            {page > 0 && <Link href={`?page=${page}`}>← Newer</Link>}
            <span>
              Page {page + 1} of {pages}
            </span>
            {page + 1 < pages && <Link href={`?page=${page + 2}`}>Older →</Link>}
          </nav>
        )}
      </Paper>
    </>
  );
}
