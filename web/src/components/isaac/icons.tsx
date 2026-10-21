// Small inked icons in the spirit of the game's HUD. Drawn by hand here rather than taken from the
// game's sprites.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 18, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      stroke="var(--ink)"
      strokeWidth={2}
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

const HEART = "M12 21s-8-5.2-8-11.2C4 6.6 6.3 4.5 8.8 4.5c1.5 0 2.6.8 3.2 1.8.6-1 1.7-1.8 3.2-1.8C17.7 4.5 20 6.6 20 9.8 20 15.8 12 21 12 21z";

// amount: 0 empty, 1 half, 2 full.
export function HeartIcon({
  amount = 2,
  color = "var(--blood)",
  ...rest
}: IconProps & { amount?: 0 | 1 | 2; color?: string }) {
  const id = `half-${color.replace(/\W/g, "")}`;
  return (
    <Icon {...rest}>
      {amount === 1 && (
        <defs>
          <linearGradient id={id}>
            <stop offset="50%" stopColor={color} />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
      )}
      <path d={HEART} fill={amount === 2 ? color : amount === 1 ? `url(#${id})` : "rgb(0 0 0 / 0.15)"} />
    </Icon>
  );
}

export function CoinIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <ellipse cx="12" cy="12" rx="8" ry="9" fill="#d9a521" />
      <path d="M12 7v10" />
    </Icon>
  );
}

export function BombIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="14" r="7" fill="#3b3b44" />
      <path d="M15 8l2-3M17 5l2 1" />
    </Icon>
  );
}

export function KeyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="4" fill="#c9c0a8" />
      <path d="M11 11l8 8M16 16l-2 2M18 18l-2 2" />
    </Icon>
  );
}

export function SkullIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 11a7 7 0 1 1 14 0v3l-2 1v4H7v-4l-2-1z" fill="var(--paper)" />
      <circle cx="9" cy="11.5" r="1.8" fill="var(--ink)" />
      <circle cx="15" cy="11.5" r="1.8" fill="var(--ink)" />
      <path d="M10 19v-2M14 19v-2" />
    </Icon>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" fill="var(--gold)" />
      <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 20h8" />
    </Icon>
  );
}

export function FlagIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 21V4" />
      <path d="M6 4h11l-3 4 3 4H6" fill="var(--paper-dark)" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" fill="var(--paper)" />
      <path d="M12 7v5l3 2" />
    </Icon>
  );
}

export function CrownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 18l-1-10 5 4 4-7 4 7 5-4-1 10z" fill="var(--gold)" />
    </Icon>
  );
}

// Stat icons, in the order the game's HUD lists stats.
export const STAT_ICONS = {
  speed: (p: IconProps) => (
    <Icon {...p}>
      <path d="M5 17l4-10h6l-2 5h5l-8 9 2-6H5z" fill="#e4c14f" />
    </Icon>
  ),
  tears: (p: IconProps) => (
    <Icon {...p}>
      <path d="M12 3c3 5 6 8 6 11a6 6 0 0 1-12 0c0-3 3-6 6-11z" fill="#6aa3d8" />
    </Icon>
  ),
  damage: (p: IconProps) => (
    <Icon {...p}>
      <path d="M14 4l6 6-9 9-4 1 1-4z" fill="#c8c8cf" />
      <path d="M5 15l4 4" />
    </Icon>
  ),
  range: (p: IconProps) => (
    <Icon {...p}>
      <circle cx="12" cy="12" r="8" fill="var(--paper)" />
      <circle cx="12" cy="12" r="3" fill="var(--blood)" />
    </Icon>
  ),
  shotSpeed: (p: IconProps) => (
    <Icon {...p}>
      <circle cx="16" cy="12" r="4" fill="#6aa3d8" />
      <path d="M3 9h7M3 15h7M5 12h6" />
    </Icon>
  ),
  luck: (p: IconProps) => (
    <Icon {...p}>
      <path
        d="M12 12c-4-6-9-2-5 2-4 3 1 8 5 2 4 6 9 1 5-2 4-4-1-8-5-2zM12 12l2 9"
        fill="var(--moss)"
      />
    </Icon>
  ),
};
