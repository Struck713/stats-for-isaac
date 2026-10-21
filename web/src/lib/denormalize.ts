// Derives the columns used for listing and sorting runs from the full Run document.
import { hitSourceName } from "@/lib/game";
import type { Run } from "@/lib/runSchema";

export function denormalize(run: Run) {
  const finalFloor =
    run.floors.find((f) => f.index === run.endedOnFloor) ?? run.floors[run.floors.length - 1];
  const itemsPickedUp = run.floors.reduce(
    (n, f) => n + f.rooms.reduce((m, r) => m + r.items.filter((i) => i.kind === "collectible").length, 0),
    0,
  );
  const startingCollectibles = run.startingItems
    .filter((i) => i.kind === "collectible")
    .reduce((n, i) => n + (i.count ?? 1), 0);
  return {
    seed: run.seed,
    runNumber: run.number,
    character: run.character,
    characterName: run.characterName,
    difficulty: run.difficulty,
    challenge: run.challenge,
    greedMode: run.greedMode,
    status: run.status,
    totalFrames: run.totalFrames,
    floorsReached: run.floors.length,
    finalFloorName: finalFloor?.name ?? null,
    killedBy: run.status === "died" && run.deathCause ? hitSourceName(run.deathCause.hit) : null,
    itemCount: startingCollectibles + itemsPickedUp,
    partial: run.partial ?? false,
    startedAt: run.startedAt ? new Date(run.startedAt * 1000) : null,
    endedAt: run.endedAt ? new Date(run.endedAt * 1000) : null,
  };
}
