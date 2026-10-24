// Small inked icons for things the game has no single sprite for. HUD, stat and minimap art uses the
// game's own sprites instead (see Sprite.tsx).
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
