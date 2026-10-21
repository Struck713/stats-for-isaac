import { hitSourceName, roomTypeName } from "@/lib/game";
import type { Item, Run } from "@/lib/runSchema";
import { SkullIcon } from "./icons";
import { Paper } from "./Paper";
import { ItemChip } from "./Stats";

// Modeled on the note the game shows when you die: what killed you, where, and what you had.
export function DeathNote({ run, items }: { run: Run; items: Item[] }) {
  const cause = run.deathCause;
  const floor = run.floors.find((f) => f.index === (cause?.floor ?? run.endedOnFloor));
  return (
    <Paper tilt={-1.2} className="mx-auto max-w-xl text-center">
      <h2 className="text-4xl">Death note</h2>
      <hr className="ink-rule mx-auto my-3 w-2/3" />
      <div className="flex flex-col items-center gap-2">
        <SkullIcon size={56} />
        <p className="font-isaac text-2xl">
          Killed by <span className="text-blood">{cause ? hitSourceName(cause.hit) : "something"}</span>
        </p>
        {floor && (
          <p className="text-lg">
            on {floor.name}
            {cause && `, in a ${roomTypeName(cause.roomType).toLowerCase()} room`}
          </p>
        )}
      </div>
      {items.length > 0 && (
        <>
          <hr className="ink-rule mx-auto my-4 w-1/2" />
          <div className="flex flex-wrap justify-center gap-1.5">
            {items.map((item, i) => (
              <ItemChip key={i} item={item} />
            ))}
          </div>
        </>
      )}
    </Paper>
  );
}
