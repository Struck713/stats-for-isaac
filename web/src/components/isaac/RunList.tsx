import Link from "next/link";
import type { RunListItem } from "@/lib/data";
import { challengeName, characterName, difficultyName, formatFrames } from "@/lib/game";
import { ResultBadge } from "./ResultBadge";

type Row = RunListItem & { ownerSteamId?: string; ownerName?: string };

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export function RunList({ runs, showOwner = false }: { runs: Row[]; showOwner?: boolean }) {
  if (runs.length === 0) {
    return <p className="italic text-ink-soft">No runs yet.</p>;
  }
  return (
    <ul>
      {runs.map((run) => {
        const challenge = challengeName(run.challenge);
        return (
          <li key={run.publicId} className="ledger-row">
            <Link
              href={`/runs/${run.publicId}`}
              className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-3 hover:bg-[rgb(255_250_235_/_0.35)] sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_auto_auto] sm:px-2"
            >
              <span className="font-isaac text-xl">{characterName(run.character, run.characterName)}</span>
              <span className="justify-self-end sm:order-last">
                <ResultBadge status={run.status} />
              </span>
              <span className="text-sm text-ink-soft sm:text-base sm:text-ink">
                {run.status === "died" && run.killedBy ? `Killed by ${run.killedBy} on ` : ""}
                {run.finalFloorName ?? "—"}
                {challenge ? ` · ${challenge}` : ""}
              </span>
              <span className="justify-self-end text-sm tabular-nums text-ink-soft">
                {formatFrames(run.totalFrames)} · {difficultyName(run.difficulty)}
                <br className="sm:hidden" />
                <span className="hidden sm:inline"> · </span>
                {showOwner && run.ownerName ? run.ownerName : dateFormat.format(run.endedAt ?? run.uploadedAt)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
