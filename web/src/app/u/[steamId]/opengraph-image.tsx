import { COLORS, EMBED_SIZE, EMBED_TYPE, At, Pixel, Stat, embedImage, inlineImage } from "@/lib/embed";
import { getUserBySteamId, getUserTotals } from "@/lib/data";
import { characterName, characterWiki } from "@/lib/game";

export const alt = "Binding of Isaac player profile";
export const size = EMBED_SIZE;
export const contentType = EMBED_TYPE;

export default async function Image({ params }: { params: Promise<{ steamId: string }> }) {
  const { steamId } = await params;
  const user = /^\d{17}$/.test(steamId) ? await getUserBySteamId(steamId) : null;
  if (!user) return embedImage(<At top={200}><div style={{ display: "flex", fontSize: 72 }}>Player not found</div></At>);

  const totals = await getUserTotals(user.id);
  const winRate = totals.runs > 0 ? Math.round((totals.wins / totals.runs) * 100) : 0;
  const hours = totals.frames / 30 / 3600;
  const favorite = totals.favorite && characterWiki(totals.favorite.character);
  const [avatar, portrait] = await Promise.all([inlineImage(user.avatarUrl), inlineImage(favorite?.image.url)]);

  return embedImage(
    <>
      <At top={44}>
        {avatar && (
          <img src={avatar} width={128} height={128} alt="" style={{ border: `6px solid ${COLORS.ink}`, borderRadius: 12 }} />
        )}
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 28, width: 780 }}>
          <div style={{ display: "flex", fontSize: 80 }}>{user.personaName}</div>
          {totals.favorite && (
            <div style={{ display: "flex", fontSize: 34, color: COLORS.inkSoft }}>
              {`favorite: ${characterName(totals.favorite.character, totals.favorite.characterName)}`}
            </div>
          )}
        </div>
        <Pixel src={portrait} width={favorite?.image.width ?? 0} height={favorite?.image.height ?? 0} scale={2} />
      </At>
      <At top={280}>
        <Stat label="runs" value={String(totals.runs)} />
        <Stat label="wins" value={String(totals.wins)} />
        <Stat label="win rate" value={`${winRate}%`} />
        <Stat label="deaths" value={String(totals.deaths)} />
        <Stat label="hours" value={hours.toFixed(1)} />
      </At>
    </>,
  );
}
