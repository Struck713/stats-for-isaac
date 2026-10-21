import type { ComponentProps, ElementType } from "react";

// A sheet of parchment. `tilt` rotates it a touch so stacked sheets don't look machine-aligned.
export function Paper<T extends ElementType = "section">({
  as,
  tilt = 0,
  className = "",
  style,
  ...rest
}: { as?: T; tilt?: number } & ComponentProps<T>) {
  const Tag = (as ?? "section") as ElementType;
  return (
    <Tag
      className={`paper p-5 sm:p-7 ${className}`}
      style={tilt ? { transform: `rotate(${tilt}deg)`, ...style } : style}
      {...rest}
    />
  );
}

export function SectionTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`mb-3 text-2xl sm:text-3xl ${className}`}>{children}</h2>;
}
