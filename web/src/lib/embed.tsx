import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { ReactNode } from "react";

export const EMBED_SIZE = { width: 1200, height: 630 };
export const EMBED_TYPE = "image/png";

export const COLORS = {
  basement: "#17100c",
  paper: "#e6d8bb",
  paperDark: "#cdb88f",
  ink: "#2a1c13",
  inkSoft: "#5a4433",
  blood: "#a3221b",
  gold: "#b8860b",
  moss: "#4d6b2f",
};

export const RESULT_COLOR = { won: COLORS.moss, died: COLORS.blood, abandoned: COLORS.inkSoft } as const;

const fontData = () => readFile(join(process.cwd(), "src/app/fonts/IsaacGame.ttf"));

// Satori can't hotlink reliably, so sprites are fetched and inlined; a failure just drops the icon.
export async function inlineImage(url: string | null | undefined): Promise<string | undefined> {
  if (!url) return undefined;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return undefined;
    const type = res.headers.get("content-type") ?? "image/png";
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return undefined;
  }
}

// Pixel art scaled by a whole number stays crisp.
export function Pixel({ src, width, height, scale }: { src?: string; width: number; height: number; scale: number }) {
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} width={width * scale} height={height * scale} alt="" style={{ imageRendering: "pixelated", flexShrink: 0 }} />;
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 180 }}>
      <div style={{ fontSize: 56, color: COLORS.ink }}>{value}</div>
      <div style={{ fontSize: 24, color: COLORS.inkSoft }}>{label}</div>
    </div>
  );
}

// Satori's flex sizing is unreliable here, so blocks sit at explicit offsets inside the card.
export function At({ top, children }: { top: number; children: ReactNode }) {
  return (
    <div style={{ display: "flex", position: "absolute", left: 56, top, width: 1000, alignItems: "center" }}>{children}</div>
  );
}

// The shared "sheet of paper on a dark basement" card.
export async function embedImage(children: ReactNode, accent: string = COLORS.blood) {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: COLORS.basement, padding: 40, fontFamily: "Isaac" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            background: COLORS.paper,
            border: `8px solid ${COLORS.ink}`,
            borderRadius: 16,
            color: COLORS.ink,
            position: "relative",
          }}
        >
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 16, background: accent, display: "flex" }} />
          {children}
          <div style={{ display: "flex", position: "absolute", right: 40, bottom: 24, fontSize: 26, color: COLORS.inkSoft }}>
            Stats for Isaac
          </div>
        </div>
      </div>
    ),
    { ...EMBED_SIZE, fonts: [{ name: "Isaac", data: await fontData(), style: "normal", weight: 400 }] },
  );
}
