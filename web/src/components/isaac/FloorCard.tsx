import { Fragment } from "react";
import { formatFrames, hitSourceName, roomTypeName, usedItemName } from "@/lib/game";
import type { Floor } from "@/lib/runSchema";
import { Minimap } from "./Minimap";
import { Paper } from "./Paper";
import { HeartAmount } from "./Sprite";
import { HudRow, ItemChip, StatTable } from "./Stats";

// "PICKUP_LIL_BATTERY" -> "Lil Battery"
function pickupName(key: string) {
  return key
    .replace(/^PICKUP_/, "")
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-isaac text-sm text-ink-soft">{label}</dt>
      <dd className="text-lg tabular-nums">{children}</dd>
    </div>
  );
}

export function FloorCard({ floor, endedHere, tilt }: { floor: Floor; endedHere: boolean; tilt: number }) {
  const s = floor.summary;
  const items = floor.rooms.flatMap((r) => r.items);
  const used = floor.rooms.flatMap((r) => r.used).filter((u) => u.flags === 0);
  const bossFights = floor.rooms.filter((r) => r.bossId !== undefined && r.clearFrames !== undefined);
  const hits = floor.rooms.flatMap((r) => r.damage);
  const enter = floor.statsOnEnter[0];
  const exit = floor.statsOnExit?.[0];
  const coins = s?.resources.coins;
  const pickups = Object.entries(s?.pickups ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <Paper as="article" tilt={tilt} aria-labelledby={`floor-${floor.index}`}>
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`floor-${floor.index}`} className="text-3xl">
          {floor.name}
          {endedHere && <span className="ml-3 text-xl text-blood">(run ended here)</span>}
        </h3>
        <span className="font-isaac text-lg">
          {floor.curseName && <span className="mr-3 text-blood">{floor.curseName}</span>}
          {floor.durationFrames !== undefined ? formatFrames(floor.durationFrames) : "—"}
        </span>
      </header>

      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex flex-col items-center gap-3 md:items-start">
          <Minimap map={floor.map} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {s && <Fact label="Explored">{s.roomsExplored}/{s.roomsInLayout} rooms</Fact>}
            {s && <Fact label="Kills">{s.kills}</Fact>}
            {s && <Fact label="Hits taken">{s.hits} (<HeartAmount halves={s.damageTaken} />)</Fact>}
            {coins && <Fact label="Coins">+{coins.gained} / −{coins.spent}</Fact>}
            {bossFights.map((r) => (
              <Fact key={r.enterFrame} label="Boss fight">
                {formatFrames(r.clearFrames!)}
              </Fact>
            ))}
          </dl>

          {items.length > 0 && (
            <div>
              <h4 className="font-isaac mb-1 text-lg">Picked up</h4>
              <div className="flex flex-wrap gap-1.5">
                {items.map((item, i) => (
                  <ItemChip key={i} item={item} />
                ))}
              </div>
            </div>
          )}

          {used.length > 0 && (
            <p>
              <span className="font-isaac mr-2 text-lg">Used</span>
              {used.map((u) => usedItemName(u)).join(", ")}
            </p>
          )}

          {pickups.length > 0 && (
            <p>
              <span className="font-isaac mr-2 text-lg">Pickups</span>
              {pickups.map(([key, n]) => `${pickupName(key)} ×${n}`).join(", ")}
            </p>
          )}

          {hits.length > 0 && (
            <p>
              <span className="font-isaac mr-2 text-lg">Hurt by</span>
              {Object.entries(
                hits.reduce<Record<string, number>>((acc, h) => {
                  const name = hitSourceName(h);
                  acc[name] = (acc[name] ?? 0) + h.amount;
                  return acc;
                }, {}),
              )
                .map(([name, amount], i) => (
                  <Fragment key={name}>
                    {i > 0 && ", "}
                    {name} (<HeartAmount halves={amount} />)
                  </Fragment>
                ))}
            </p>
          )}
        </div>

        {enter && (
          <div className="flex flex-col gap-3 md:shrink-0">
            <StatTable enter={enter} exit={exit} />
            <HudRow snapshot={exit ?? enter} />
          </div>
        )}
      </div>

      {floor.rooms.length > 0 && (
        <details className="mt-5">
          <summary className="font-isaac cursor-pointer text-lg">Room by room ({floor.rooms.length} visits)</summary>
          <ol className="mt-2 grid gap-x-6 sm:grid-cols-2">
            {floor.rooms.map((r, i) => (
              <li key={i} className="ledger-row flex justify-between gap-3 py-1 text-sm">
                <span>
                  {i + 1}. {roomTypeName(r.typeName)}
                  {r.firstVisit ? "" : " (again)"}
                  {r.kills.length > 0 && ` · ${r.kills.length} kills`}
                  {r.items.length > 0 && ` · ${r.items.length} item${r.items.length > 1 ? "s" : ""}`}
                  {r.damage.length > 0 && <span className="text-blood"> · hit ×{r.damage.length}</span>}
                </span>
                <span className="tabular-nums text-ink-soft">
                  {r.durationFrames !== undefined ? formatFrames(r.durationFrames) : "—"}
                </span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </Paper>
  );
}
