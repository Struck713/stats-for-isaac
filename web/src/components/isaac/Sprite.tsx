import { sprite, type SpriteName } from "@/lib/game";

// A game sprite drawn at a whole multiple of its native size so the pixel art stays crisp.
export function Sprite({ name, scale = 2, alt = "", className = "" }: { name: SpriteName; scale?: number; alt?: string; className?: string }) {
  const { url, width, height } = sprite(name);
  return (
    // Wiki sprites are tiny pixel art; next/image would only re-encode them.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} width={width * scale} height={height * scale} className={`inline-block [image-rendering:pixelated] ${className}`} />
  );
}

// "1.5 ♥" with a heart sprite, for amounts of damage given in half hearts.
export function HeartAmount({ halves, scale = 1 }: { halves: number; scale?: number }) {
  return (
    <span className="whitespace-nowrap">
      {halves / 2} <Sprite name="heartRedFull" scale={scale} alt="hearts" className="-mt-1 align-middle" />
    </span>
  );
}
