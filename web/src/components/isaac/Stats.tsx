import { itemName, itemWiki, tearsPerSecond } from "@/lib/game";
import type { Item, PlayerSnapshot } from "@/lib/runSchema";
import { BombIcon, CoinIcon, HeartIcon, KeyIcon, STAT_ICONS } from "./icons";

const STATS: { key: keyof typeof STAT_ICONS; label: string; value: (s: PlayerSnapshot) => number }[] = [
  { key: "speed", label: "Speed", value: (s) => s.moveSpeed },
  { key: "tears", label: "Tears", value: (s) => tearsPerSecond(s.maxFireDelay) },
  { key: "damage", label: "Damage", value: (s) => s.damage },
  { key: "range", label: "Range", value: (s) => s.tearRange / 40 },
  { key: "shotSpeed", label: "Shot speed", value: (s) => s.shotSpeed },
  { key: "luck", label: "Luck", value: (s) => s.luck },
];

const fmt = (n: number) => n.toFixed(2);

// The HUD stat column, with the change over the floor when there's an exit snapshot.
export function StatTable({ enter, exit }: { enter: PlayerSnapshot; exit?: PlayerSnapshot }) {
  return (
    <table className="text-base">
      <tbody>
        {STATS.map(({ key, label, value }) => {
          const Icon = STAT_ICONS[key];
          const before = value(enter);
          const after = exit ? value(exit) : undefined;
          const delta = after !== undefined ? after - before : 0;
          return (
            <tr key={key}>
              <td className="pr-2 py-0.5">
                <Icon size={18} />
              </td>
              <td className="pr-3 font-isaac">{label}</td>
              <td className="pr-2 tabular-nums">{fmt(after ?? before)}</td>
              <td className="tabular-nums text-sm">
                {Math.abs(delta) >= 0.005 && (
                  <span style={{ color: delta > 0 ? "var(--moss)" : "var(--blood)" }}>
                    {delta > 0 ? "+" : ""}
                    {fmt(delta)}
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const num = (s: PlayerSnapshot, key: string) => (typeof s[key] === "number" ? (s[key] as number) : 0);

// Health and consumables as the HUD shows them: red containers, then soul/black hearts.
export function HudRow({ snapshot }: { snapshot: PlayerSnapshot }) {
  const red = num(snapshot, "hearts");
  const containers = Math.ceil(num(snapshot, "maxHearts") / 2);
  const soul = num(snapshot, "soulHearts");
  const hearts: { amount: 0 | 1 | 2; color: string }[] = [];
  for (let i = 0; i < containers; i++) {
    const left = red - i * 2;
    hearts.push({ amount: left >= 2 ? 2 : left === 1 ? 1 : 0, color: "var(--blood)" });
  }
  for (let i = 0; i < Math.ceil(soul / 2); i++) {
    hearts.push({ amount: soul - i * 2 >= 2 ? 2 : 1, color: "var(--soul)" });
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className="flex flex-wrap gap-0.5" aria-label={`${red / 2} red hearts, ${soul / 2} soul hearts`}>
        {hearts.length === 0 ? (
          <span className="text-ink-soft italic">no hearts</span>
        ) : (
          hearts.map((h, i) => <HeartIcon key={i} amount={h.amount} color={h.color} size={20} />)
        )}
      </span>
      <span className="flex items-center gap-3 tabular-nums">
        <span className="flex items-center gap-1"><CoinIcon size={16} />{num(snapshot, "coins")}</span>
        <span className="flex items-center gap-1"><BombIcon size={16} />{num(snapshot, "bombs")}</span>
        <span className="flex items-center gap-1"><KeyIcon size={16} />{num(snapshot, "keys")}</span>
      </span>
    </div>
  );
}

export function ItemChip({ item }: { item: Item }) {
  const trinket = item.kind === "trinket";
  const wiki = itemWiki(item);
  const props = {
    className: "inline-flex items-center gap-1 rounded-md border-2 border-ink px-2 py-0.5 text-sm",
    style: { background: trinket ? "#d7cbe0" : "#f4ead2" },
    title: `${trinket ? "Trinket" : "Item"} #${item.id}${item.price ? ` (bought for ${item.price > 0 ? `${item.price}¢` : "a devil deal"})` : ""}`,
  };
  const content = (
    <>
      {wiki?.image && (
        // Wiki icons are 32px pixel art; next/image would only re-encode them.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={wiki.image} alt="" width={24} height={24} loading="lazy" className="-my-0.5 [image-rendering:pixelated]" />
      )}
      {itemName(item)}
      {item.count && item.count > 1 ? <span className="text-ink-soft">×{item.count}</span> : null}
      {item.price ? <span className="text-ink-soft">{item.price > 0 ? "$" : "†"}</span> : null}
    </>
  );
  if (!wiki) return <span {...props}>{content}</span>;
  return (
    <a {...props} href={wiki.url} target="_blank" rel="noopener noreferrer" className={`${props.className} hover:underline`}>
      {content}
    </a>
  );
}
