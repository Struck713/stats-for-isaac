import { FlagIcon, SkullIcon, TrophyIcon } from "./icons";

const RESULTS = {
  won: { label: "Victory", Icon: TrophyIcon, color: "var(--gold)" },
  died: { label: "Died", Icon: SkullIcon, color: "var(--blood)" },
  abandoned: { label: "Abandoned", Icon: FlagIcon, color: "var(--ink-soft)" },
} as const;

export function ResultBadge({ status, size = "md" }: { status: string; size?: "md" | "lg" }) {
  const result = RESULTS[status as keyof typeof RESULTS] ?? RESULTS.abandoned;
  const big = size === "lg";
  return (
    <span
      className={`font-isaac inline-flex items-center gap-1.5 whitespace-nowrap ${big ? "text-2xl" : "text-lg"}`}
      style={{ color: result.color }}
    >
      <result.Icon size={big ? 28 : 20} />
      {result.label}
    </span>
  );
}
